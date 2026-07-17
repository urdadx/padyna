import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";
import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  markDatasourceFailed,
  replaceDatasourceChunksAndMarkSynced,
} from "@padyna/db/ingestion-files";

export interface IngestTextInput {
  content: string;
  title?: string;
  chatbotId: string;
  organizationId: string;
}

export interface IngestedTextResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function ingestText(input: IngestTextInput): Promise<IngestedTextResult> {
  const { content, title, chatbotId, organizationId } = input;

  if (!content || !content.trim()) {
    return {
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Content is required",
    };
  }

  const contentHash = hashText(content);
  const sizeBytes = new TextEncoder().encode(content).length;

  let datasourceId: string;

  try {
    datasourceId = await createDatasourceRecord({
      chatbotId,
      organizationId,
      sourceName: title || content.slice(0, 100),
      sourceType: "text",
      sizeBytes,
      contentHash,
    });
  } catch (error) {
    console.error("Failed to create text datasource record:", error);
    return {
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Failed to initialize text record",
    };
  }

  try {
    const charCount = content.length;
    const tokenCount = estimateContentTokens(content);

    const chunks = chunkText(content);
    const chunkTitle = title || content.slice(0, 100);

    const {
      embeddings: embeddingVectors,
      dimensions,
      model,
    } = await embedTexts(chunks.map((chunk) => `${chunkTitle}\n\n${chunk.content}`));

    await replaceDatasourceChunksAndMarkSynced(
      chunks.map((chunk, index) => ({
        datasourceId: datasourceId,
        chatbotId,
        organizationId,
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
        datasourceId,
        contentText: content,
        contentHash,
        tokenCount,
        charCount,
        chunkCount: chunks.length,
        mimeType: "text/plain",
      },
    );

    await incrementChatbotDatasourceCount(chatbotId, organizationId);

    return {
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error(`Failed to ingest text:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await markDatasourceFailed(datasourceId, errorMessage);

    return {
      datasourceId,
      status: "failed",
      chunkCount: 0,
      message: errorMessage,
    };
  }
}
