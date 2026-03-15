CREATE INDEX "datasources_fulltext_search_idx"
  ON "datasources" USING gin (
    (
      setweight(to_tsvector('simple', coalesce("source_name", '')), 'A') ||
      setweight(to_tsvector('simple', coalesce("question", '')), 'A') ||
      setweight(to_tsvector('simple', coalesce("answer", '')), 'A') ||
      setweight(to_tsvector('simple', coalesce("content_text", '')), 'B')
    )
  );
