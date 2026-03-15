CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "datasource_chunks"
  ALTER COLUMN "embedding" TYPE vector(1536)
  USING (
    CASE
      WHEN "embedding" IS NULL THEN NULL
      ELSE regexp_replace("embedding"::text, '\\s', '', 'g')::vector(1536)
    END
  );

CREATE INDEX "datasource_chunks_embedding_cosine_idx"
  ON "datasource_chunks" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
