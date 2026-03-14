import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";
import { db } from "@padyna/db";
import { eq } from "drizzle-orm";
import { datasourceChunks, datasources } from "@padyna/db/schema/datasource";
import {
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";

export interface UpdateQaInput {
  id: string;
  question: string;
  answer: string;
}

export interface UpdateQaResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function updateQa(input: UpdateQaInput): Promise<UpdateQaResult> {
  const { id, question, answer } = input;

  const contentText = `Q: ${question}\nA: ${answer}`;
  const contentHash = hashText(contentText);
  const sizeBytes = new TextEncoder().encode(contentText).length;

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
        sourceName: question.slice(0, 100),
        question,
        answer,
        contentText,
        contentHash,
        sizeBytes,
        ingestStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(datasources.id, id));

    const charCount = contentText.length;
    const tokenCount = estimateContentTokens(contentText);

    const chunks = chunkText(contentText);

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
      contentText,
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
    console.error(`Failed to update Q&A:`, error);
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
