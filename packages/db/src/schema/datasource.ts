import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const datasources = pgTable(
  "datasources",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    sourceType: varchar("source_type", {
      enum: ["link", "file", "qa", "text"],
    }).notNull(),
    sourceName: text("source_name").notNull(),

    ingestStatus: varchar("ingest_status", {
      enum: ["pending", "processing", "synced", "failed", "archived"],
    })
      .notNull()
      .default("pending"),

    timesReferenced: integer("times_referenced").notNull().default(0),

    sizeBytes: bigint("size_bytes", { mode: "number" }),
    fileName: text("file_name"),
    fileKey: text("file_key"),
    fileHash: text("file_hash"),
    mimeType: text("mime_type"),
    url: text("url"),
    canonicalUrl: text("canonical_url"),
    domain: text("domain"),

    question: text("question"),
    answer: text("answer"),

    contentText: text("content_text").notNull().default(""),
    contentHash: text("content_hash"),
    language: text("language").default("en"),
    tokenCount: integer("token_count"),
    charCount: integer("char_count"),
    chunkCount: integer("chunk_count").notNull().default(0),

    sourceConfig: jsonb("source_config").$type<Record<string, unknown>>(),
    providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>(),
    extraMetadata: jsonb("extra_metadata").$type<Record<string, unknown>>(),

    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    lastErrorAt: timestamp("last_error_at"),
    retryCount: integer("retry_count").notNull().default(0),

    lastSyncedAt: timestamp("last_synced_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("datasources_chatbot_id_idx").on(table.chatbotId),
    index("datasources_organization_id_idx").on(table.organizationId),
    index("datasources_ingest_status_idx").on(table.ingestStatus),
    index("datasources_source_type_idx").on(table.sourceType),
    index("datasources_last_synced_at_idx").on(table.lastSyncedAt),
  ],
);

export const datasourceChunks = pgTable(
  "datasource_chunks",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    datasourceId: uuid("datasource_id")
      .notNull()
      .references(() => datasources.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    chunkIndex: integer("chunk_index").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    contentHash: text("content_hash"),
    tokenCount: integer("token_count"),
    charCount: integer("char_count"),

    embedding: jsonb("embedding").$type<number[]>(),
    embeddingModel: text("embedding_model"),
    embeddingDimensions: integer("embedding_dimensions"),
    lastEmbeddedAt: timestamp("last_embedded_at"),

    extraMetadata: jsonb("extra_metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("datasource_chunks_datasource_id_idx").on(table.datasourceId),
    index("datasource_chunks_chatbot_id_idx").on(table.chatbotId),
    index("datasource_chunks_organization_id_idx").on(table.organizationId),
    uniqueIndex("datasource_chunks_datasource_chunk_index_uidx").on(
      table.datasourceId,
      table.chunkIndex,
    ),
  ],
);
