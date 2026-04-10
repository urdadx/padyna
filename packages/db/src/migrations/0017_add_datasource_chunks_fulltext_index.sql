CREATE INDEX "datasource_chunks_fulltext_search_idx"
  ON "datasource_chunks" USING gin (
    (
      setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('simple', coalesce("content", '')), 'B')
    )
  );
