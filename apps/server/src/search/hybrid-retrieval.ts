import { db } from "@padyna/db";
import { datasourceChunks, datasources } from "@padyna/db/schema/index";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { searchDatasourcesByFullText } from "./fulltext-search";
import { searchSemanticChunks } from "./semantic-vector-search";

export interface HybridRetrievalInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  semanticCandidateLimit?: number;
  fullTextDatasourceLimit?: number;
  fullTextChunksPerDatasource?: number;
  rrfK?: number;
}

export interface HybridRetrievedChunk {
  chunkId: string;
  datasourceId: string;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text";
  url: string | null;
  fusedScore: number;
  semanticScore: number | null;
  fullTextScore: number | null;
  semanticRank: number | null;
  fullTextRank: number | null;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_SEMANTIC_LIMIT = 30;
const DEFAULT_FTS_DATASOURCE_LIMIT = 20;
const DEFAULT_FTS_CHUNKS_PER_DATASOURCE = 3;
const DEFAULT_RRF_K = 60;
const MAX_LIMIT = 50;

function clamp(value: number | undefined, fallback: number, min = 1, max = MAX_LIMIT) {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(value, max));
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function reciprocalRank(rank: number, k: number) {
  return 1 / (k + rank);
}

type ChunkCandidate = {
  chunkId: string;
  datasourceId: string;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text";
  url: string | null;
  score: number;
};

async function loadChunksForDatasources(
  chatbotId: string,
  organizationId: string,
  datasourceIds: string[],
  perDatasourceLimit: number,
): Promise<ChunkCandidate[]> {
  if (datasourceIds.length === 0) {
    return [];
  }

  const fetchLimit = Math.max(datasourceIds.length * perDatasourceLimit * 4, 50);
  const rows = await db
    .select({
      chunkId: datasourceChunks.id,
      datasourceId: datasourceChunks.datasourceId,
      content: datasourceChunks.content,
      chunkIndex: datasourceChunks.chunkIndex,
      sourceName: datasources.sourceName,
      sourceType: datasources.sourceType,
      url: datasources.url,
    })
    .from(datasourceChunks)
    .innerJoin(datasources, eq(datasourceChunks.datasourceId, datasources.id))
    .where(
      and(
        eq(datasourceChunks.chatbotId, chatbotId),
        eq(datasourceChunks.organizationId, organizationId),
        inArray(datasourceChunks.datasourceId, datasourceIds),
        eq(datasources.ingestStatus, "synced"),
        isNull(datasources.deletedAt),
      ),
    )
    .orderBy(desc(datasources.updatedAt), asc(datasourceChunks.chunkIndex))
    .limit(fetchLimit);

  const keptPerDatasource = new Map<string, number>();
  const results: ChunkCandidate[] = [];

  for (const row of rows) {
    const current = keptPerDatasource.get(row.datasourceId) ?? 0;
    if (current >= perDatasourceLimit) {
      continue;
    }

    keptPerDatasource.set(row.datasourceId, current + 1);
    results.push({
      chunkId: row.chunkId,
      datasourceId: row.datasourceId,
      content: row.content,
      chunkIndex: row.chunkIndex,
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      url: row.url,
      score: 0,
    });
  }

  return results;
}

export async function retrieveHybridChunks(
  input: HybridRetrievalInput,
): Promise<HybridRetrievedChunk[]> {
  const query = normalizeQuery(input.query);
  if (!query) {
    return [];
  }

  const limit = clamp(input.limit, DEFAULT_LIMIT);
  const semanticCandidateLimit = clamp(input.semanticCandidateLimit, DEFAULT_SEMANTIC_LIMIT);
  const ftsDatasourceLimit = clamp(input.fullTextDatasourceLimit, DEFAULT_FTS_DATASOURCE_LIMIT);
  const ftsChunksPerDatasource = clamp(
    input.fullTextChunksPerDatasource,
    DEFAULT_FTS_CHUNKS_PER_DATASOURCE,
    1,
    10,
  );
  const rrfK = clamp(input.rrfK, DEFAULT_RRF_K, 1, 500);

  const [fullTextDatasources, globalSemantic] = await Promise.all([
    searchDatasourcesByFullText({
      query,
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      limit: ftsDatasourceLimit,
      includeUnsynced: false,
    }),
    searchSemanticChunks({
      query,
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      limit: semanticCandidateLimit,
    }),
  ]);

  const datasourceIds = fullTextDatasources.map((row) => row.datasourceId);
  const [ftsChunks, semanticScoped] = await Promise.all([
    loadChunksForDatasources(
      input.chatbotId,
      input.organizationId,
      datasourceIds,
      ftsChunksPerDatasource,
    ),
    datasourceIds.length > 0
      ? searchSemanticChunks({
          query,
          chatbotId: input.chatbotId,
          organizationId: input.organizationId,
          datasourceIds,
          limit: semanticCandidateLimit,
        })
      : Promise.resolve([]),
  ]);

  const semanticMerged = [...globalSemantic, ...semanticScoped]
    .sort((a, b) => b.score - a.score)
    .filter((row, index, list) => index === list.findIndex((item) => item.chunkId === row.chunkId));

  const datasourceRank = new Map(
    fullTextDatasources.map((row, index) => [row.datasourceId, index + 1]),
  );
  const datasourceScore = new Map(fullTextDatasources.map((row) => [row.datasourceId, row.score]));

  const ftsRanked = ftsChunks
    .map((chunk) => ({
      ...chunk,
      score: datasourceScore.get(chunk.datasourceId) ?? 0,
      datasourceRank: datasourceRank.get(chunk.datasourceId) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (a.datasourceRank !== b.datasourceRank) {
        return a.datasourceRank - b.datasourceRank;
      }
      return a.chunkIndex - b.chunkIndex;
    });

  const semanticRankByChunk = new Map<string, number>();
  const semanticScoreByChunk = new Map<string, number>();
  semanticMerged.forEach((row, index) => {
    semanticRankByChunk.set(row.chunkId, index + 1);
    semanticScoreByChunk.set(row.chunkId, row.score);
  });

  const ftsRankByChunk = new Map<string, number>();
  const ftsScoreByChunk = new Map<string, number>();
  ftsRanked.forEach((row, index) => {
    ftsRankByChunk.set(row.chunkId, index + 1);
    ftsScoreByChunk.set(row.chunkId, row.score);
  });

  const metadataByChunk = new Map<
    string,
    Omit<
      HybridRetrievedChunk,
      "fusedScore" | "semanticScore" | "fullTextScore" | "semanticRank" | "fullTextRank"
    >
  >();
  for (const row of semanticMerged) {
    metadataByChunk.set(row.chunkId, {
      chunkId: row.chunkId,
      datasourceId: row.datasourceId,
      content: row.content,
      chunkIndex: row.chunkIndex,
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      url: row.url,
    });
  }
  for (const row of ftsRanked) {
    if (!metadataByChunk.has(row.chunkId)) {
      metadataByChunk.set(row.chunkId, {
        chunkId: row.chunkId,
        datasourceId: row.datasourceId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        sourceName: row.sourceName,
        sourceType: row.sourceType,
        url: row.url,
      });
    }
  }

  const chunkIds = new Set<string>([...semanticRankByChunk.keys(), ...ftsRankByChunk.keys()]);

  const ranked = Array.from(chunkIds)
    .map((chunkId) => {
      const semanticRank = semanticRankByChunk.get(chunkId);
      const fullTextRank = ftsRankByChunk.get(chunkId);
      const fusedScore =
        (semanticRank ? reciprocalRank(semanticRank, rrfK) : 0) +
        (fullTextRank ? reciprocalRank(fullTextRank, rrfK) : 0);

      const metadata = metadataByChunk.get(chunkId);
      if (!metadata) {
        return null;
      }

      return {
        ...metadata,
        fusedScore,
        semanticScore: semanticScoreByChunk.get(chunkId) ?? null,
        fullTextScore: ftsScoreByChunk.get(chunkId) ?? null,
        semanticRank: semanticRank ?? null,
        fullTextRank: fullTextRank ?? null,
      } satisfies HybridRetrievedChunk;
    })
    .filter((row): row is HybridRetrievedChunk => row !== null)
    .sort((a, b) => {
      if (b.fusedScore !== a.fusedScore) {
        return b.fusedScore - a.fusedScore;
      }
      if ((b.semanticScore ?? -Infinity) !== (a.semanticScore ?? -Infinity)) {
        return (b.semanticScore ?? -Infinity) - (a.semanticScore ?? -Infinity);
      }
      return (b.fullTextScore ?? -Infinity) - (a.fullTextScore ?? -Infinity);
    })
    .slice(0, limit);

  return ranked;
}
