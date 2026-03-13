import { and, eq, sql } from "drizzle-orm";

import { db } from ".";
import { chatbot } from "./schema/chatbot";
import { datasourceChunks, datasources } from "./schema/datasource";

interface CreateDatasourceInput {
  chatbotId: string;
  organizationId: string;
  sourceName: string;
  sizeBytes?: number;
  mimeType?: string;
  fileHash?: string;
  contentHash?: string;
  sourceType?: "file" | "link";
  url?: string;
}

interface UpdateDatasourceSuccessInput {
  datasourceId: string;
  contentText: string;
  contentHash: string;
  tokenCount: number;
  charCount: number;
  chunkCount: number;
  mimeType: string;
}

interface InsertChunkInput {
  datasourceId: string;
  chatbotId: string;
  organizationId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  tokenCount: number;
  charCount: number;
  embedding: number[];
  embeddingDimensions: number;
}

export async function createDatasourceRecord(input: CreateDatasourceInput) {
  // Check for existing record to update instead of create
  let existingId: string | undefined;

  if (input.sourceType === "link" && input.url) {
    const existing = await db.query.datasources.findFirst({
      where: and(eq(datasources.chatbotId, input.chatbotId), eq(datasources.url, input.url)),
      columns: { id: true },
    });
    if (existing) {
      existingId = existing.id;
    }
  } else if (input.fileHash) {
    // If file hash is provided (binary hash), check against fileHash column
    // This allows re-ingestion of same file even if contentHash (text hash) changed
    const existing = await db.query.datasources.findFirst({
      where: and(
        eq(datasources.chatbotId, input.chatbotId),
        eq(datasources.fileHash, input.fileHash),
      ),
      columns: { id: true },
    });
    if (existing) {
      existingId = existing.id;
    }
  } else if (input.contentHash) {
    // Fallback for non-file sources checking contentHash
    const existing = await db.query.datasources.findFirst({
      where: and(
        eq(datasources.chatbotId, input.chatbotId),
        eq(datasources.contentHash, input.contentHash),
      ),
      columns: { id: true },
    });
    if (existing) {
      existingId = existing.id;
    }
  }

  if (existingId) {
    // Update existing record
    await db
      .update(datasources)
      .set({
        ingestStatus: "processing",
        lastErrorAt: null,
        errorMessage: null,
        updatedAt: new Date(),
        // Update source name/mime type if provided
        ...(input.sourceName ? { sourceName: input.sourceName } : {}),
        ...(input.mimeType ? { mimeType: input.mimeType } : {}),
        // Update fileHash if provided (e.g. if record existed but didn't have fileHash set)
        ...(input.fileHash ? { fileHash: input.fileHash } : {}),
      })
      .where(eq(datasources.id, existingId));

    // Clear old chunks to avoid duplication
    await db.delete(datasourceChunks).where(eq(datasourceChunks.datasourceId, existingId));

    return existingId;
  }

  const [created] = await db
    .insert(datasources)
    .values({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      sourceType: input.sourceType ?? "file",
      sourceName: input.sourceName,
      ingestStatus: "processing",
      sizeBytes: input.sizeBytes ?? 0,
      fileName: input.sourceType === "link" ? null : input.sourceName,
      url: input.url,
      mimeType: input.mimeType,
      fileHash: input.fileHash,
      contentHash: input.contentHash ?? input.fileHash,
    })
    .returning({ id: datasources.id });

  if (!created) {
    throw new Error("Failed to create datasource record.");
  }

  return created.id;
}

export async function markDatasourceFailed(datasourceId: string, message: string) {
  await db
    .update(datasources)
    .set({
      ingestStatus: "failed",
      errorMessage: message,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(datasources.id, datasourceId));
}

export async function insertDatasourceChunks(chunks: InsertChunkInput[]) {
  if (chunks.length === 0) {
    return;
  }

  await db.insert(datasourceChunks).values(
    chunks.map((chunk) => ({
      datasourceId: chunk.datasourceId,
      chatbotId: chunk.chatbotId,
      organizationId: chunk.organizationId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      contentHash: chunk.contentHash,
      tokenCount: chunk.tokenCount,
      charCount: chunk.charCount,
      embedding: chunk.embedding,
      embeddingModel: "deterministic-hash-v1",
      embeddingDimensions: chunk.embeddingDimensions,
      lastEmbeddedAt: new Date(),
    })),
  );
}

export async function markDatasourceSynced(input: UpdateDatasourceSuccessInput) {
  await db
    .update(datasources)
    .set({
      ingestStatus: "synced",
      contentText: input.contentText,
      contentHash: input.contentHash,
      tokenCount: input.tokenCount,
      charCount: input.charCount,
      chunkCount: input.chunkCount,
      mimeType: input.mimeType,
      lastSyncedAt: new Date(),
      errorMessage: null,
      errorCode: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(datasources.id, input.datasourceId));
}

export async function incrementChatbotDatasourceCount(chatbotId: string, organizationId: string) {
  await db
    .update(chatbot)
    .set({
      dataSourcesCount: sql`${chatbot.dataSourcesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(chatbot.id, chatbotId), eq(chatbot.organizationId, organizationId)));
}
