import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";
import { db } from "@padyna/db";
import { and, eq } from "drizzle-orm";
import { datasources } from "@padyna/db/schema/datasource";
import {
  markDatasourceFailed,
  replaceDatasourceChunksAndMarkSynced,
} from "@padyna/db/ingestion-files";

export interface UpdateQaInput {
  id: string;
  question: string;
  answer: string;
  chatbotId: string;
  organizationId: string;
}

export interface UpdateQaResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function updateQa(input: UpdateQaInput): Promise<UpdateQaResult> {
  const { id, question, answer, chatbotId, organizationId } = input;

  const contentText = `Q: ${question}\nA: ${answer}`;
  const contentHash = hashText(contentText);
  const sizeBytes = new TextEncoder().encode(contentText).length;

  try {
    const existing = await db.query.datasources.findFirst({
      where: and(
        eq(datasources.id, id),
        eq(datasources.chatbotId, chatbotId),
        eq(datasources.organizationId, organizationId),
      ),
    });

    if (!existing) {
      return {
        datasourceId: id,
        status: "failed",
        chunkCount: 0,
        message: "Datasource not found",
      };
    }

    const charCount = contentText.length;
    const tokenCount = estimateContentTokens(contentText);

    const chunks = chunkText(contentText);

    const {
      embeddings: embeddingVectors,
      dimensions,
      model,
    } = await embedTexts(
      chunks.map((chunk) => `${question}\n\n${chunk.content}`),
      { reuseFromDatasourceId: id },
    );

    await replaceDatasourceChunksAndMarkSynced(
      chunks.map((chunk, index) => ({
        datasourceId: id,
        chatbotId: existing.chatbotId,
        organizationId: existing.organizationId,
        chunkIndex: chunk.chunkIndex,
        title: question,
        content: chunk.content,
        contentHash: hashText(chunk.content),
        tokenCount: chunk.tokenCount,
        charCount: chunk.charCount,
        embedding: embeddingVectors[index]!,
        embeddingModel: model,
        embeddingDimensions: dimensions,
      })),
      {
        datasourceId: id,
        contentText,
        contentHash,
        tokenCount,
        charCount,
        chunkCount: chunks.length,
        mimeType: "text/plain",
        sourceName: question.slice(0, 100),
        sizeBytes,
        question,
        answer,
      },
    );

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
