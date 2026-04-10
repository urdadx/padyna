```sql
EXPLAIN (ANALYZE, BUFFERS)
WITH params AS (
  SELECT
    $$[PASTE_FULL_VECTOR_HERE]$$::vector AS query_vector,
    websearch_to_tsquery('simple', 'TanStack Start') AS ts_query
),
semantic_candidates AS (
  SELECT
    dc.id AS chunk_id,
    dc.datasource_id,
    (1 - (dc.embedding <=> p.query_vector)) AS semantic_score
  FROM datasource_chunks dc
  JOIN datasources d ON d.id = dc.datasource_id
  CROSS JOIN params p
  WHERE dc.chatbot_id = '3219d984-0afc-450c-941e-fbee1ade4158'
    AND dc.organization_id = '5c3ad098-eabd-4f26-a61b-b6dda5ba88f8'
    AND d.ingest_status = 'synced'
    AND d.deleted_at IS NULL
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> p.query_vector ASC
  LIMIT 30
),
semantic AS (
  SELECT
    chunk_id,
    datasource_id,
    semantic_score,
    row_number() OVER (ORDER BY semantic_score DESC)::integer AS semantic_rank
  FROM semantic_candidates
),
fts_candidates AS (
  SELECT
    dc.id AS chunk_id,
    dc.datasource_id,
    ts_rank_cd(
      setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B'),
      p.ts_query
    ) AS full_text_score,
    dc.updated_at
  FROM datasource_chunks dc
  JOIN datasources d ON d.id = dc.datasource_id
  CROSS JOIN params p
  WHERE dc.chatbot_id = '3219d984-0afc-450c-941e-fbee1ade4158'
    AND dc.organization_id = '5c3ad098-eabd-4f26-a61b-b6dda5ba88f8'
    AND d.ingest_status = 'synced'
    AND d.deleted_at IS NULL
    AND (
      setweight(to_tsvector('simple', coalesce(dc.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(dc.content, '')), 'B')
    ) @@ p.ts_query
  ORDER BY full_text_score DESC, dc.updated_at DESC
  LIMIT 30
),
fts AS (
  SELECT
    chunk_id,
    datasource_id,
    full_text_score,
    row_number() OVER (
      ORDER BY full_text_score DESC, updated_at DESC
    )::integer AS full_text_rank
  FROM fts_candidates
),
fused AS (
  SELECT
    coalesce(s.chunk_id, f.chunk_id) AS chunk_id,
    coalesce(s.datasource_id, f.datasource_id) AS datasource_id,
    s.semantic_score,
    s.semantic_rank,
    f.full_text_score,
    f.full_text_rank,
    coalesce(1.0 / (60 + s.semantic_rank), 0) +
    coalesce(1.0 / (60 + f.full_text_rank), 0) AS fused_score
  FROM semantic s
  FULL OUTER JOIN fts f ON f.chunk_id = s.chunk_id
)
SELECT
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
FROM fused
JOIN datasource_chunks dc ON dc.id = fused.chunk_id
JOIN datasources d ON d.id = fused.datasource_id
ORDER BY
  fused.fused_score DESC,
  fused.semantic_score DESC NULLS LAST,
  fused.full_text_score DESC NULLS LAST
LIMIT 8;
```
