import { getPgPool } from "@padyna/db";
import { embedTextForSemanticSearch } from "./semantic-search";

export interface HybridRetrievalInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  semanticCandidateLimit?: number;
  fullTextChunkLimit?: number;
  rrfK?: number;
}

export interface HybridRetrievedChunk {
  chunkId: string;
  datasourceId: string;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text" | "notion" | "google_drive";
  url: string | null;
  fusedScore: number;
  semanticScore: number | null;
  fullTextScore: number | null;
  semanticRank: number | null;
  fullTextRank: number | null;
}

interface HybridRetrievedChunkRow {
  chunk_id: string;
  datasource_id: string;
  content: string;
  chunk_index: number;
  source_name: string;
  source_type: "link" | "file" | "qa" | "text" | "notion" | "google_drive";
  url: string | null;
  fused_score: number;
  semantic_score: number | null;
  full_text_score: number | null;
  semantic_rank: number | null;
  full_text_rank: number | null;
}

const DEFAULT_LIMIT = 8;
const DEFAULT_SEMANTIC_LIMIT = 30;
const DEFAULT_FTS_CHUNK_LIMIT = 30;
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

function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
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
  const ftsChunkLimit = clamp(input.fullTextChunkLimit, DEFAULT_FTS_CHUNK_LIMIT);
  const rrfK = clamp(input.rrfK, DEFAULT_RRF_K, 1, 500);
  const queryEmbedding = await embedTextForSemanticSearch(query);
  const vectorLiteral = embeddingToVectorLiteral(queryEmbedding);

  const result = await getPgPool().query<HybridRetrievedChunkRow>(
    `
      with semantic_candidates as (
        select
          dc.id as chunk_id,
          dc.datasource_id,
          (1 - (dc.embedding <=> $1::vector)) as semantic_score
        from datasource_chunks dc
        join datasources d on d.id = dc.datasource_id
        where dc.chatbot_id = $2
          and dc.organization_id = $3
          and d.ingest_status = 'synced'
          and d.deleted_at is null
          and dc.embedding is not null
        order by dc.embedding <=> $1::vector asc
        limit $4
      ),
      semantic as (
        select
          chunk_id,
          datasource_id,
          semantic_score,
          row_number() over (order by semantic_score desc)::integer as semantic_rank
        from semantic_candidates
      ),
      fts_candidates as (
        select
          dc.id as chunk_id,
          dc.datasource_id,
          ts_rank_cd(
            setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B'),
            websearch_to_tsquery('simple', $5)
          ) as full_text_score,
          dc.updated_at
        from datasource_chunks dc
        join datasources d on d.id = dc.datasource_id
        where dc.chatbot_id = $2
          and dc.organization_id = $3
          and d.ingest_status = 'synced'
          and d.deleted_at is null
          and (
            setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B')
          ) @@ websearch_to_tsquery('simple', $5)
        order by full_text_score desc, dc.updated_at desc
        limit $6
      ),
      fts as (
        select
          chunk_id,
          datasource_id,
          full_text_score,
          row_number() over (order by full_text_score desc, updated_at desc)::integer as full_text_rank
        from fts_candidates
      ),
      fused as (
        select
          coalesce(s.chunk_id, f.chunk_id) as chunk_id,
          coalesce(s.datasource_id, f.datasource_id) as datasource_id,
          s.semantic_score,
          s.semantic_rank,
          f.full_text_score,
          f.full_text_rank,
          coalesce(1.0 / ($7 + s.semantic_rank), 0) +
            coalesce(1.0 / ($7 + f.full_text_rank), 0) as fused_score
        from semantic s
        full outer join fts f on f.chunk_id = s.chunk_id
      )
      select
        fused.chunk_id,
        fused.datasource_id,
        dc.content,
        dc.chunk_index,
        d.source_name,
        d.source_type,
        d.url,
        fused.fused_score,
        fused.semantic_score,
        fused.full_text_score,
        fused.semantic_rank,
        fused.full_text_rank
      from fused
      join datasource_chunks dc on dc.id = fused.chunk_id
      join datasources d on d.id = fused.datasource_id
      order by
        fused.fused_score desc,
        fused.semantic_score desc nulls last,
        fused.full_text_score desc nulls last
      limit $8
    `,
    [
      vectorLiteral,
      input.chatbotId,
      input.organizationId,
      semanticCandidateLimit,
      query,
      ftsChunkLimit,
      rrfK,
      limit,
    ],
  );

  return result.rows.map((row) => ({
    chunkId: row.chunk_id,
    datasourceId: row.datasource_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    sourceName: row.source_name,
    sourceType: row.source_type,
    url: row.url,
    fusedScore: Number(row.fused_score),
    semanticScore: row.semantic_score === null ? null : Number(row.semantic_score),
    fullTextScore: row.full_text_score === null ? null : Number(row.full_text_score),
    semanticRank: row.semantic_rank === null ? null : Number(row.semantic_rank),
    fullTextRank: row.full_text_rank === null ? null : Number(row.full_text_rank),
  }));
}
