import { chunkText, estimateContentTokens } from "../file/chunking";
import { embedTexts } from "../file/embeddings";
import { hashText } from "../file/hash";
import { db } from "@padyna/db";
import { eq } from "drizzle-orm";
import { datasourceChunks, datasources } from "@padyna/db/schema/datasource";
import {
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";

export interface UpdateTextInput {
  id: string;
  content: string;
  title?: string;
}

export interface UpdateTextResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function updateText(input: UpdateTextInput): Promise<UpdateTextResult> {
  const { id, content, title } = input;

  if (!content || !content.trim()) {
    return {
      datasourceId: id,
      status: "failed",
      chunkCount: 0,
      message: "Content is required",
    };
  }

  const contentHash = hashText(content);
  const sizeBytes = new TextEncoder().encode(content).length;

  try {
    const existing = await db.query.datasources.findFirst({
      where: eq(datasources.id, id),
    });

    if (!existing) {
      return {
        datasourceId: id,
        status: "failed",
        chunkCount: 0,
        message: "Datasource not found",
      };
    }

    await db.delete(datasourceChunks).where(eq(datasourceChunks.datasourceId, id));

    await db
      .update(datasources)
      .set({
        sourceName: title || content.slice(0, 100),
        contentText: content,
        contentHash,
        sizeBytes,
        ingestStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(datasources.id, id));

    const charCount = content.length;
    const tokenCount = estimateContentTokens(content);

    const chunks = chunkText(content);

    const { embeddings: embeddingVectors, dimensions } = await embedTexts(
      chunks.map((c) => c.content),
    );

    await insertDatasourceChunks(
      chunks.map((chunk, index) => ({
        datasourceId: id,
        chatbotId: existing.chatbotId,
        organizationId: existing.organizationId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        contentHash: hashText(chunk.content),
        tokenCount: chunk.tokenCount,
        charCount: chunk.charCount,
        embedding: embeddingVectors[index]!,
        embeddingDimensions: dimensions,
      })),
    );

    await markDatasourceSynced({
      datasourceId: id,
      contentText: content,
      contentHash,
      tokenCount,
      charCount,
      chunkCount: chunks.length,
      mimeType: "text/plain",
    });

    return {
      datasourceId: id,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error(`Failed to update text:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await markDatasourceFailed(id, errorMessage);

    return {
      datasourceId: id,
      status: "failed",
      chunkCount: 0,
      message: errorMessage,
    };
  }
}
