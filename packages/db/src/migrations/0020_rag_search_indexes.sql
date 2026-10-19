-- Semantic search is now an exact scan within one chatbot; the global IVFFlat index
-- was bypassed at query time (enable_indexscan = off) and only cost write overhead.
DROP INDEX IF EXISTS "datasource_chunks_embedding_cosine_idx";

-- Full-text search moves from the 'simple' config to 'english' (stemming, stop words),
-- with the search vector stored instead of recomputed per query.
ALTER TABLE "datasource_chunks"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") ||
    setweight(to_tsvector('english'::regconfig, content), 'B'::"char")
  ) STORED;

CREATE INDEX IF NOT EXISTS "datasource_chunks_search_vector_idx"
  ON "datasource_chunks" USING gin ("search_vector");

DROP INDEX IF EXISTS "datasource_chunks_fulltext_search_idx";
DROP INDEX IF EXISTS "datasource_chunks_fulltext_english_idx";
