import { getPgPool } from "@padyna/db";
import { env } from "@padyna/env/server";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../lib/embeddings";
import { embedTextForSemanticSearch } from "./semantic-search";

type SourceType = "link" | "file" | "qa" | "text" | "notion" | "google_drive";
export type SemanticSearchMode = "approximate" | "exact";

export interface HybridRetrievalMetrics {
  totalMs: number;
  embeddingMs: number | null;
  semanticMs: number | null;
  fullTextMs: number | null;
  semanticCandidates: number;
  fullTextCandidates: number;
  resultCount: number;
  degradedToFullText: boolean;
}

export interface HybridRetrievalInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  semanticCandidateLimit?: number;
  fullTextChunkLimit?: number;
  maxChunksPerDatasource?: number;
  minSemanticScore?: number;
  semanticWeight?: number;
  fullTextWeight?: number;
  semanticSearchMode?: SemanticSearchMode;
  rrfK?: number;
  onMetrics?: (metrics: HybridRetrievalMetrics) => void;
  abortSignal?: AbortSignal;
}

export interface HybridRetrievedChunk {
  chunkId: string;
  datasourceId: string;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: SourceType;
  url: string | null;
  fusedScore: number;
  semanticScore: number | null;
  fullTextScore: number | null;
  semanticRank: number | null;
  fullTextRank: number | null;
}

interface CandidateRow {
  chunk_id: string;
  datasource_id: string;
  content: string;
  content_hash: string | null;
  chunk_index: number;
  source_name: string;
  source_type: SourceType;
  url: string | null;
  score: number;
  rank: number;
}

export interface RankedRetrievalCandidate {
  chunkId: string;
  datasourceId: string;
  content: string;
  contentHash: string | null;
  chunkIndex: number;
  sourceName: string;
  sourceType: SourceType;
  url: string | null;
  score: number;
  rank: number;
}

export interface FusionOptions {
  limit: number;
  maxChunksPerDatasource: number;
  rrfK: number;
  semanticWeight: number;
  fullTextWeight: number;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_SEMANTIC_LIMIT = 40;
const DEFAULT_FTS_CHUNK_LIMIT = 40;
const DEFAULT_MAX_CHUNKS_PER_DATASOURCE = 2;
const DEFAULT_MIN_SEMANTIC_SCORE = 0.2;
const DEFAULT_RRF_K = 60;
const MAX_LIMIT = 50;
const MAX_CANDIDATE_LIMIT = 200;
const LEGACY_EMBEDDING_MODEL = "deterministic-hash-v1";

function clamp(value: number | undefined, fallback: number, min = 1, max = MAX_LIMIT) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.floor(Math.max(min, Math.min(value, max)));
}

function clampScore(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(-1, Math.min(value, 1));
}

function clampWeight(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(value, 5));
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function mapCandidateRow(row: CandidateRow): RankedRetrievalCandidate {
  return {
    chunkId: row.chunk_id,
    datasourceId: row.datasource_id,
    content: row.content,
    contentHash: row.content_hash,
    chunkIndex: Number(row.chunk_index),
    sourceName: row.source_name,
    sourceType: row.source_type,
    url: row.url,
    score: Number(row.score),
    rank: Number(row.rank),
  };
}

async function retrieveFullTextCandidates(
  query: string,
  chatbotId: string,
  organizationId: string,
  limit: number,
) {
  const startedAt = performance.now();
  const result = await getPgPool().query<CandidateRow>(
    `
      with search_query as (
        select websearch_to_tsquery('simple', $1) as value
      ), candidates as (
        select
          dc.id as chunk_id,
          dc.datasource_id,
          dc.content,
          dc.content_hash,
          dc.chunk_index,
          d.source_name,
          d.source_type,
          d.url,
          ts_rank_cd(
            setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B'),
            search_query.value
          ) as score,
          dc.updated_at
        from datasource_chunks dc
        join datasources d on d.id = dc.datasource_id
        cross join search_query
        where dc.chatbot_id = $2
          and dc.organization_id = $3
          and d.ingest_status = 'synced'
          and d.deleted_at is null
          and (
            setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B')
          ) @@ search_query.value
        order by score desc, dc.updated_at desc, dc.id asc
        limit $4
      )
      select
        chunk_id,
        datasource_id,
        content,
        content_hash,
        chunk_index,
        source_name,
        source_type,
        url,
        score,
        row_number() over (order by score desc, updated_at desc, chunk_id asc)::integer as rank
      from candidates
      order by rank asc
    `,
    [query, chatbotId, organizationId, limit],
  );

  return {
    candidates: result.rows.map(mapCandidateRow),
    durationMs: performance.now() - startedAt,
  };
}

async function retrieveSemanticCandidates(
  embedding: number[],
  chatbotId: string,
  organizationId: string,
  limit: number,
  minScore: number,
  searchMode: SemanticSearchMode,
) {
  const startedAt = performance.now();
  const client = await getPgPool().connect();

  try {
    await client.query("begin");
    if (searchMode === "exact") {
      await client.query("set local enable_indexscan = off");
    } else {
      await client.query("set local ivfflat.probes = 10");
    }
    const result = await client.query<CandidateRow>(
      `
      with candidates as (
        select
          dc.id as chunk_id,
          dc.datasource_id,
          dc.content,
          dc.content_hash,
          dc.chunk_index,
          d.source_name,
          d.source_type,
          d.url,
          (1 - (dc.embedding <=> $1::vector)) as score
        from datasource_chunks dc
        join datasources d on d.id = dc.datasource_id
        where dc.chatbot_id = $2
          and dc.organization_id = $3
          and d.ingest_status = 'synced'
          and d.deleted_at is null
          and dc.embedding is not null
          and dc.embedding_dimensions = $4
          and dc.embedding_model in ($5, $6)
        order by dc.embedding <=> $1::vector asc, dc.id asc
        limit $7
      ), relevant as (
        select *
        from candidates
        where score >= $8
      )
      select
        chunk_id,
        datasource_id,
        content,
        content_hash,
        chunk_index,
        source_name,
        source_type,
        url,
        score,
        row_number() over (order by score desc, chunk_id asc)::integer as rank
      from relevant
      order by rank asc
      `,
      [
        embeddingToVectorLiteral(embedding),
        chatbotId,
        organizationId,
        EMBEDDING_DIMENSIONS,
        EMBEDDING_MODEL,
        LEGACY_EMBEDDING_MODEL,
        limit,
        minScore,
      ],
    );
    await client.query("commit");

    return {
      candidates: result.rows.map(mapCandidateRow),
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function fuseRetrievalCandidates(
  semanticCandidates: RankedRetrievalCandidate[],
  fullTextCandidates: RankedRetrievalCandidate[],
  options: FusionOptions,
): HybridRetrievedChunk[] {
  const fused = new Map<string, HybridRetrievedChunk & { contentHash: string | null }>();

  for (const candidate of semanticCandidates) {
    fused.set(candidate.chunkId, {
      chunkId: candidate.chunkId,
      datasourceId: candidate.datasourceId,
      content: candidate.content,
      contentHash: candidate.contentHash,
      chunkIndex: candidate.chunkIndex,
      sourceName: candidate.sourceName,
      sourceType: candidate.sourceType,
      url: candidate.url,
      fusedScore: options.semanticWeight / (options.rrfK + candidate.rank),
      semanticScore: candidate.score,
      fullTextScore: null,
      semanticRank: candidate.rank,
      fullTextRank: null,
    });
  }

  for (const candidate of fullTextCandidates) {
    const existing = fused.get(candidate.chunkId);
    const contribution = options.fullTextWeight / (options.rrfK + candidate.rank);

    if (existing) {
      existing.fusedScore += contribution;
      existing.fullTextScore = candidate.score;
      existing.fullTextRank = candidate.rank;
      continue;
    }

    fused.set(candidate.chunkId, {
      chunkId: candidate.chunkId,
      datasourceId: candidate.datasourceId,
      content: candidate.content,
      contentHash: candidate.contentHash,
      chunkIndex: candidate.chunkIndex,
      sourceName: candidate.sourceName,
      sourceType: candidate.sourceType,
      url: candidate.url,
      fusedScore: contribution,
      semanticScore: null,
      fullTextScore: candidate.score,
      semanticRank: null,
      fullTextRank: candidate.rank,
    });
  }

  const ordered = [...fused.values()].sort((left, right) => {
    return (
      right.fusedScore - left.fusedScore ||
      (right.semanticScore ?? -Infinity) - (left.semanticScore ?? -Infinity) ||
      (right.fullTextScore ?? -Infinity) - (left.fullTextScore ?? -Infinity) ||
      left.chunkId.localeCompare(right.chunkId)
    );
  });

  const datasourceCounts = new Map<string, number>();
  const seenContent = new Set<string>();
  const results: HybridRetrievedChunk[] = [];

  for (const candidate of ordered) {
    const contentKey = candidate.contentHash || candidate.content.trim().replace(/\s+/g, " ");
    const datasourceCount = datasourceCounts.get(candidate.datasourceId) ?? 0;

    if (seenContent.has(contentKey) || datasourceCount >= options.maxChunksPerDatasource) {
      continue;
    }

    const { contentHash: _contentHash, ...result } = candidate;
    results.push(result);
    seenContent.add(contentKey);
    datasourceCounts.set(candidate.datasourceId, datasourceCount + 1);

    if (results.length >= options.limit) {
      break;
    }
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

  const startedAt = performance.now();
  const limit = clamp(input.limit, DEFAULT_LIMIT);
  const semanticCandidateLimit = clamp(
    input.semanticCandidateLimit,
    DEFAULT_SEMANTIC_LIMIT,
    limit,
    MAX_CANDIDATE_LIMIT,
  );
  const fullTextCandidateLimit = clamp(
    input.fullTextChunkLimit,
    DEFAULT_FTS_CHUNK_LIMIT,
    limit,
    MAX_CANDIDATE_LIMIT,
  );
  const fusionOptions: FusionOptions = {
    limit,
    maxChunksPerDatasource: clamp(
      input.maxChunksPerDatasource,
      DEFAULT_MAX_CHUNKS_PER_DATASOURCE,
      1,
      limit,
    ),
    rrfK: clamp(input.rrfK, DEFAULT_RRF_K, 1, 500),
    semanticWeight: clampWeight(input.semanticWeight),
    fullTextWeight: clampWeight(input.fullTextWeight),
  };

  const fullTextPromise = retrieveFullTextCandidates(
    query,
    input.chatbotId,
    input.organizationId,
    fullTextCandidateLimit,
  );
  const embeddingStartedAt = performance.now();
  let embeddingMs: number | null = null;
  const semanticPromise = embedTextForSemanticSearch(query, input.abortSignal).then((embedding) => {
    embeddingMs = performance.now() - embeddingStartedAt;
    return retrieveSemanticCandidates(
      embedding,
      input.chatbotId,
      input.organizationId,
      semanticCandidateLimit,
      clampScore(input.minSemanticScore, DEFAULT_MIN_SEMANTIC_SCORE),
      input.semanticSearchMode ?? env.RAG_SEMANTIC_SEARCH_MODE,
    );
  });

  const [semanticResult, fullTextResult] = await Promise.allSettled([
    semanticPromise,
    fullTextPromise,
  ]);

  if (semanticResult.status === "rejected" && fullTextResult.status === "rejected") {
    throw new AggregateError(
      [semanticResult.reason, fullTextResult.reason],
      "Semantic and full-text retrieval both failed.",
    );
  }

  if (semanticResult.status === "rejected") {
    console.error(
      "Semantic retrieval failed; using full-text results only.",
      semanticResult.reason,
    );
  }
  if (fullTextResult.status === "rejected") {
    console.error(
      "Full-text retrieval failed; using semantic results only.",
      fullTextResult.reason,
    );
  }

  const semanticCandidates =
    semanticResult.status === "fulfilled" ? semanticResult.value.candidates : [];
  const fullTextCandidates =
    fullTextResult.status === "fulfilled" ? fullTextResult.value.candidates : [];
  const results = fuseRetrievalCandidates(semanticCandidates, fullTextCandidates, fusionOptions);

  input.onMetrics?.({
    totalMs: performance.now() - startedAt,
    embeddingMs,
    semanticMs: semanticResult.status === "fulfilled" ? semanticResult.value.durationMs : null,
    fullTextMs: fullTextResult.status === "fulfilled" ? fullTextResult.value.durationMs : null,
    semanticCandidates: semanticCandidates.length,
    fullTextCandidates: fullTextCandidates.length,
    resultCount: results.length,
    degradedToFullText: semanticResult.status === "rejected",
  });

  return results;
}
