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

export interface UpdateTextInput {
  id: string;
  content: string;
  title?: string;
  chatbotId: string;
  organizationId: string;
}

export interface UpdateTextResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function updateText(input: UpdateTextInput): Promise<UpdateTextResult> {
  const { id, content, title, chatbotId, organizationId } = input;

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

    const charCount = content.length;
    const tokenCount = estimateContentTokens(content);

    const chunks = chunkText(content);
    const chunkTitle = title || content.slice(0, 100);

    const {
      embeddings: embeddingVectors,
      dimensions,
      model,
    } = await embedTexts(
      chunks.map((chunk) => `${chunkTitle}\n\n${chunk.content}`),
      { reuseFromDatasourceId: id },
    );

    await replaceDatasourceChunksAndMarkSynced(
      chunks.map((chunk, index) => ({
        datasourceId: id,
        chatbotId: existing.chatbotId,
        organizationId: existing.organizationId,
        chunkIndex: chunk.chunkIndex,
        title: chunkTitle,
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
        contentText: content,
        contentHash,
        tokenCount,
        charCount,
        chunkCount: chunks.length,
        mimeType: "text/plain",
        sourceName: chunkTitle,
        sizeBytes,
      },
    );

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
