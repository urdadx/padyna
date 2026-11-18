import { getPgPool } from "@padyna/db";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../lib/embeddings";
import { embedTextForSemanticSearch } from "./semantic-search";

type SourceType = "link" | "file" | "qa" | "text" | "notion" | "google_drive";

// Why full-text search ran instead of semantic search.
export type FullTextFallbackReason = "semantic_failed" | "no_semantic_matches";

export interface RetrievalMetrics {
  totalMs: number;
  embeddingMs: number | null;
  semanticMs: number | null;
  fullTextMs: number | null;
  semanticCandidates: number;
  fullTextCandidates: number;
  resultCount: number;
  fullTextFallback: FullTextFallbackReason | null;
}

export interface RetrievalInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  semanticCandidateLimit?: number;
  fullTextChunkLimit?: number;
  maxChunksPerDatasource?: number;
  minSemanticScore?: number;
  onMetrics?: (metrics: RetrievalMetrics) => void;
  abortSignal?: AbortSignal;
}

export interface RetrievedChunk {
  chunkId: string;
  datasourceId: string;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: SourceType;
  url: string | null;
  score: number;
  matchedBy: "semantic" | "full_text";
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

export interface SelectionOptions {
  limit: number;
  maxChunksPerDatasource: number;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_SEMANTIC_LIMIT = 40;
const DEFAULT_FTS_CHUNK_LIMIT = 40;
const DEFAULT_MAX_CHUNKS_PER_DATASOURCE = 2;
const DEFAULT_MIN_SEMANTIC_SCORE = 0.2;
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
        -- Match any meaningful term rather than all of them: visitors ask full questions
        -- ("how do I reset my password?") and requiring every word left full-text search
        -- with no hits for almost all of them. ts_rank_cd still ranks chunks that cover
        -- more of the terms higher. 'english' adds stemming and drops stop words.
        select to_tsquery(
          'english',
          replace(plainto_tsquery('english', $1)::text, ' & ', ' | ')
        ) as value
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
            dc.search_vector,
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
          and dc.search_vector @@ search_query.value
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

// Exact nearest-neighbour search within one chatbot's chunks. Filtering by chatbot
// first (btree index) keeps this cheap at per-chatbot corpus sizes, and unlike a
// global approximate index it can't lose a small tenant's matches to the filter.
async function retrieveSemanticCandidates(
  embedding: number[],
  chatbotId: string,
  organizationId: string,
  limit: number,
  minScore: number,
) {
  const startedAt = performance.now();
  const result = await getPgPool().query<CandidateRow>(
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

  return {
    candidates: result.rows.map(mapCandidateRow),
    durationMs: performance.now() - startedAt,
  };
}

// Keeps the best-ranked candidates, skipping repeated content and capping how many
// chunks one datasource contributes so a single long document can't fill the context.
export function selectRetrievalCandidates(
  candidates: RankedRetrievalCandidate[],
  matchedBy: RetrievedChunk["matchedBy"],
  options: SelectionOptions,
): RetrievedChunk[] {
  const ordered = [...candidates].sort(
    (left, right) => left.rank - right.rank || left.chunkId.localeCompare(right.chunkId),
  );

  const datasourceCounts = new Map<string, number>();
  const seenContent = new Set<string>();
  const results: RetrievedChunk[] = [];

  for (const candidate of ordered) {
    const contentKey = candidate.contentHash || candidate.content.trim().replace(/\s+/g, " ");
    const datasourceCount = datasourceCounts.get(candidate.datasourceId) ?? 0;

    if (seenContent.has(contentKey) || datasourceCount >= options.maxChunksPerDatasource) {
      continue;
    }

    results.push({
      chunkId: candidate.chunkId,
      datasourceId: candidate.datasourceId,
      content: candidate.content,
      chunkIndex: candidate.chunkIndex,
      sourceName: candidate.sourceName,
      sourceType: candidate.sourceType,
      url: candidate.url,
      score: candidate.score,
      matchedBy,
    });
    seenContent.add(contentKey);
    datasourceCounts.set(candidate.datasourceId, datasourceCount + 1);

    if (results.length >= options.limit) {
      break;
    }
  }

  return results;
}

// Semantic search answers the query. Full-text search is only the fallback, for when
// the embedding call or the semantic query fails, or nothing clears the minimum score.
// Mixing it into every result list (rank fusion) ranked the right source lower on the
// evaluation set: its "any term" matches outranked better semantic hits.
export async function retrieveChunks(input: RetrievalInput): Promise<RetrievedChunk[]> {
  const query = normalizeQuery(input.query);
  if (!query) {
    return [];
  }

  const startedAt = performance.now();
  const limit = clamp(input.limit, DEFAULT_LIMIT);
  const selectionOptions: SelectionOptions = {
    limit,
    maxChunksPerDatasource: clamp(
      input.maxChunksPerDatasource,
      DEFAULT_MAX_CHUNKS_PER_DATASOURCE,
      1,
      limit,
    ),
  };

  let embeddingMs: number | null = null;
  let semantic: Awaited<ReturnType<typeof retrieveSemanticCandidates>> | null = null;
  let semanticError: unknown = null;
  try {
    const embeddingStartedAt = performance.now();
    const embedding = await embedTextForSemanticSearch(query, input.abortSignal);
    embeddingMs = performance.now() - embeddingStartedAt;
    semantic = await retrieveSemanticCandidates(
      embedding,
      input.chatbotId,
      input.organizationId,
      clamp(input.semanticCandidateLimit, DEFAULT_SEMANTIC_LIMIT, limit, MAX_CANDIDATE_LIMIT),
      clampScore(input.minSemanticScore, DEFAULT_MIN_SEMANTIC_SCORE),
    );
  } catch (error) {
    // A cancelled request has no one to answer; don't run the fallback for it.
    if (input.abortSignal?.aborted) {
      throw error;
    }
    semanticError = error;
  }

  let fullText: Awaited<ReturnType<typeof retrieveFullTextCandidates>> | null = null;
  let fullTextFallback: FullTextFallbackReason | null = null;
  let results: RetrievedChunk[];

  if (semantic && semantic.candidates.length > 0) {
    results = selectRetrievalCandidates(semantic.candidates, "semantic", selectionOptions);
  } else {
    fullTextFallback = semantic ? "no_semantic_matches" : "semantic_failed";
    if (semanticError) {
      console.error("Semantic retrieval failed; falling back to full-text search.", semanticError);
    }

    try {
      fullText = await retrieveFullTextCandidates(
        query,
        input.chatbotId,
        input.organizationId,
        clamp(input.fullTextChunkLimit, DEFAULT_FTS_CHUNK_LIMIT, limit, MAX_CANDIDATE_LIMIT),
      );
    } catch (error) {
      if (semanticError) {
        throw new AggregateError(
          [semanticError, error],
          "Semantic and full-text retrieval both failed.",
        );
      }
      // Semantic search worked and found nothing relevant; that answer stands.
      console.error("Full-text fallback failed.", error);
    }
    results = fullText
      ? selectRetrievalCandidates(fullText.candidates, "full_text", selectionOptions)
      : [];
  }

  input.onMetrics?.({
    totalMs: performance.now() - startedAt,
    embeddingMs,
    semanticMs: semantic?.durationMs ?? null,
    fullTextMs: fullText?.durationMs ?? null,
    semanticCandidates: semantic?.candidates.length ?? 0,
    fullTextCandidates: fullText?.candidates.length ?? 0,
    resultCount: results.length,
    fullTextFallback,
  });

  return results;
}
