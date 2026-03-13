import { chunkText, estimateContentTokens } from "../file/chunking";
import { embedTexts } from "../file/embeddings";
import { hashText } from "../file/hash";
import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";

export interface IngestQaInput {
  question: string;
  answer: string;
  chatbotId: string;
  organizationId: string;
}

export interface IngestedQaResult {
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function ingestQa(input: IngestQaInput): Promise<IngestedQaResult> {
  const { question, answer, chatbotId, organizationId } = input;

  const contentText = `Q: ${question}\nA: ${answer}`;
  const contentHash = hashText(contentText);
  const sizeBytes = new TextEncoder().encode(contentText).length;

  let datasourceId: string;

  try {
    datasourceId = await createDatasourceRecord({
      chatbotId,
      organizationId,
      sourceName: question.slice(0, 100),
      sourceType: "qa",
      question,
      answer,
      sizeBytes,
      contentHash,
    });
  } catch (error) {
    console.error("Failed to create Q&A datasource record:", error);
    return {
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Failed to initialize Q&A record",
    };
  }

  try {
    const charCount = contentText.length;
    const tokenCount = estimateContentTokens(contentText);

    const chunks = chunkText(contentText);

    const { embeddings: embeddingVectors, dimensions } = await embedTexts(
      chunks.map((c) => c.content),
    );

    await insertDatasourceChunks(
      chunks.map((chunk, index) => ({
        datasourceId: datasourceId,
        chatbotId,
        organizationId,
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
      datasourceId,
      contentText,
      contentHash,
      tokenCount,
      charCount,
      chunkCount: chunks.length,
      mimeType: "text/plain",
    });

    await incrementChatbotDatasourceCount(chatbotId, organizationId);

    return {
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error(`Failed to ingest Q&A:`, error);
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
