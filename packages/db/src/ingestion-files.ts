import { and, eq, sql } from "drizzle-orm";

import { db } from ".";
import { chatbot } from "./schema/chatbot";
import { datasourceChunks, datasources } from "./schema/datasource";

const CHUNK_INSERT_BATCH_SIZE = 250;

interface CreateDatasourceInput {
  chatbotId: string;
  organizationId: string;
  sourceName: string;
  sizeBytes?: number;
  mimeType?: string;
  fileHash?: string;
  contentHash?: string;
  sourceType?: "file" | "link" | "qa" | "text" | "notion" | "google_drive";
  url?: string;
  question?: string;
  answer?: string;
  sourceConfig?: Record<string, unknown>;
  providerPayload?: Record<string, unknown>;
  extraMetadata?: Record<string, unknown>;
}

export interface UpdateDatasourceSuccessInput {
  datasourceId: string;
  contentText: string;
  contentHash: string;
  tokenCount: number;
  charCount: number;
  chunkCount: number;
  mimeType: string;
  sourceName?: string;
  sizeBytes?: number;
  question?: string;
  answer?: string;
}

interface InsertChunkInput {
  datasourceId: string;
  chatbotId: string;
  organizationId: string;
  chunkIndex: number;
  title: string;
  content: string;
  contentHash: string;
  tokenCount: number;
  charCount: number;
  embedding: number[];
  embeddingModel: string;
  embeddingDimensions: number;
}

export async function createDatasourceRecord(input: CreateDatasourceInput) {
  let existingId: string | undefined;

  if (
    (input.sourceType === "link" ||
      input.sourceType === "notion" ||
      input.sourceType === "google_drive") &&
    input.url
  ) {
    const existing = await db.query.datasources.findFirst({
      where: and(eq(datasources.chatbotId, input.chatbotId), eq(datasources.url, input.url)),
      columns: { id: true },
    });
    if (existing) {
      existingId = existing.id;
    }
  } else if (input.fileHash) {
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
    await db
      .update(datasources)
      .set({
        lastErrorAt: null,
        errorMessage: null,
        updatedAt: new Date(),
        ...(input.sourceName ? { sourceName: input.sourceName } : {}),
        ...(input.mimeType ? { mimeType: input.mimeType } : {}),
        ...(input.fileHash ? { fileHash: input.fileHash } : {}),
        ...(input.question ? { question: input.question } : {}),
        ...(input.answer ? { answer: input.answer } : {}),
        ...(input.url ? { url: input.url } : {}),
        ...(input.sourceConfig ? { sourceConfig: input.sourceConfig } : {}),
        ...(input.providerPayload ? { providerPayload: input.providerPayload } : {}),
        ...(input.extraMetadata ? { extraMetadata: input.extraMetadata } : {}),
      })
      .where(eq(datasources.id, existingId));

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
      fileName: input.sourceType === "file" ? input.sourceName : null,
      url: input.url,
      mimeType: input.mimeType,
      fileHash: input.fileHash,
      contentHash: input.contentHash ?? input.fileHash,
      question: input.question,
      answer: input.answer,
      sourceConfig: input.sourceConfig,
      providerPayload: input.providerPayload,
      extraMetadata: input.extraMetadata,
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
      ingestStatus: sql<"synced" | "failed">`case
        when exists (
          select 1 from ${datasourceChunks}
          where ${datasourceChunks.datasourceId} = ${datasourceId}
        ) then 'synced'
        else 'failed'
      end`,
      errorMessage: message,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(datasources.id, datasourceId));
}

export async function replaceDatasourceChunksAndMarkSynced(
  chunks: InsertChunkInput[],
  input: UpdateDatasourceSuccessInput,
) {
  if (chunks.length === 0) {
    throw new Error("Cannot replace a datasource with an empty chunk set.");
  }

  const datasourceId = chunks[0]!.datasourceId;
  if (chunks.some((chunk) => chunk.datasourceId !== datasourceId)) {
    throw new Error("A chunk replacement must target exactly one datasource.");
  }
  if (input.datasourceId !== datasourceId) {
    throw new Error("Chunk and datasource updates must target the same datasource.");
  }

  const values = chunks.map((chunk) => ({
    datasourceId: chunk.datasourceId,
    chatbotId: chunk.chatbotId,
    organizationId: chunk.organizationId,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    content: chunk.content,
    contentHash: chunk.contentHash,
    tokenCount: chunk.tokenCount,
    charCount: chunk.charCount,
    embedding: chunk.embedding,
    embeddingModel: chunk.embeddingModel,
    embeddingDimensions: chunk.embeddingDimensions,
    lastEmbeddedAt: new Date(),
  }));

  await db.transaction(async (transaction) => {
    await transaction
      .delete(datasourceChunks)
      .where(eq(datasourceChunks.datasourceId, datasourceId));
    for (let index = 0; index < values.length; index += CHUNK_INSERT_BATCH_SIZE) {
      await transaction
        .insert(datasourceChunks)
        .values(values.slice(index, index + CHUNK_INSERT_BATCH_SIZE));
    }
    await transaction
      .update(datasources)
      .set({
        ingestStatus: "synced",
        contentText: input.contentText,
        contentHash: input.contentHash,
        tokenCount: input.tokenCount,
        charCount: input.charCount,
        chunkCount: input.chunkCount,
        mimeType: input.mimeType,
        ...(input.sourceName !== undefined ? { sourceName: input.sourceName } : {}),
        ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
        ...(input.question !== undefined ? { question: input.question } : {}),
        ...(input.answer !== undefined ? { answer: input.answer } : {}),
        lastSyncedAt: new Date(),
        errorMessage: null,
        errorCode: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      })
      .where(eq(datasources.id, input.datasourceId));
  });
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
