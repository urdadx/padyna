UPDATE "datasource_chunks"
SET "embedding_model" = 'text-embedding-3-small'
WHERE "embedding_model" = 'deterministic-hash-v1'
  AND "embedding_dimensions" = 1536;

UPDATE "datasource_chunks" AS chunks
SET "title" = sources."source_name"
FROM "datasources" AS sources
WHERE sources."id" = chunks."datasource_id"
  AND chunks."title" IS NULL;

CREATE INDEX IF NOT EXISTS "datasource_chunks_fulltext_search_idx"
  ON "datasource_chunks" USING gin (
    (
      setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('simple', coalesce("content", '')), 'B')
    )
  );

CREATE INDEX IF NOT EXISTS "datasource_chunks_search_scope_idx"
  ON "datasource_chunks" (
    "chatbot_id",
    "organization_id",
    "embedding_model",
    "embedding_dimensions"
  );
