CREATE TABLE "datasources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "organization_id" text NOT NULL,
  "source_type" varchar(4) NOT NULL,
  "source_name" text NOT NULL,
  "ingest_status" varchar(10) DEFAULT 'pending' NOT NULL,
  "times_referenced" integer DEFAULT 0 NOT NULL,
  "size_bytes" bigint,
  "file_name" text,
  "file_key" text,
  "mime_type" text,
  "url" text,
  "canonical_url" text,
  "domain" text,
  "question" text,
  "answer" text,
  "content_text" text DEFAULT '' NOT NULL,
  "content_hash" text,
  "language" text DEFAULT 'en',
  "token_count" integer,
  "char_count" integer,
  "chunk_count" integer DEFAULT 0 NOT NULL,
  "source_config" jsonb,
  "provider_payload" jsonb,
  "extra_metadata" jsonb,
  "error_code" text,
  "error_message" text,
  "last_error_at" timestamp,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  CONSTRAINT "datasources_chatbot_id_chatbot_id_fk"
    FOREIGN KEY ("chatbot_id")
    REFERENCES "public"."chatbot"("id")
    ON DELETE cascade,
  CONSTRAINT "datasources_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organization"("id")
    ON DELETE cascade,
  CONSTRAINT "datasources_source_type_chk"
    CHECK ("source_type" IN ('link', 'file', 'qa', 'text')),
  CONSTRAINT "datasources_ingest_status_chk"
    CHECK ("ingest_status" IN ('pending', 'processing', 'synced', 'failed', 'archived'))
);

CREATE INDEX "datasources_chatbot_id_idx" ON "datasources" USING btree ("chatbot_id");
CREATE INDEX "datasources_organization_id_idx" ON "datasources" USING btree ("organization_id");
CREATE INDEX "datasources_ingest_status_idx" ON "datasources" USING btree ("ingest_status");
CREATE INDEX "datasources_source_type_idx" ON "datasources" USING btree ("source_type");
CREATE INDEX "datasources_last_synced_at_idx" ON "datasources" USING btree ("last_synced_at");
CREATE UNIQUE INDEX "datasources_chatbot_content_hash_uidx"
  ON "datasources" USING btree ("chatbot_id", "content_hash");

CREATE TABLE "datasource_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "datasource_id" uuid NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "organization_id" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "title" text,
  "content" text NOT NULL,
  "content_hash" text,
  "token_count" integer,
  "char_count" integer,
  "embedding" jsonb,
  "embedding_model" text,
  "embedding_dimensions" integer,
  "last_embedded_at" timestamp,
  "extra_metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "datasource_chunks_datasource_id_datasources_id_fk"
    FOREIGN KEY ("datasource_id")
    REFERENCES "public"."datasources"("id")
    ON DELETE cascade,
  CONSTRAINT "datasource_chunks_chatbot_id_chatbot_id_fk"
    FOREIGN KEY ("chatbot_id")
    REFERENCES "public"."chatbot"("id")
    ON DELETE cascade,
  CONSTRAINT "datasource_chunks_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organization"("id")
    ON DELETE cascade
);

CREATE INDEX "datasource_chunks_datasource_id_idx"
  ON "datasource_chunks" USING btree ("datasource_id");
CREATE INDEX "datasource_chunks_chatbot_id_idx"
  ON "datasource_chunks" USING btree ("chatbot_id");
CREATE INDEX "datasource_chunks_organization_id_idx"
  ON "datasource_chunks" USING btree ("organization_id");
CREATE UNIQUE INDEX "datasource_chunks_datasource_chunk_index_uidx"
  ON "datasource_chunks" USING btree ("datasource_id", "chunk_index");