import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";
import { runLinkScrape } from "./run-scrapping";
import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";
import type { IngestLinkInput, IngestedLinkResult } from "./types";

function normalizeMimeType(url: string) {
  if (url.endsWith(".pdf")) return "application/pdf";
  return "text/html";
}

export async function ingestLink(input: IngestLinkInput): Promise<IngestedLinkResult> {
  const { url, chatbotId, organizationId } = input;

  const urlHash = hashText(url);

  let datasourceId: string;
  const scrapedContent = await runLinkScrape(url);
  const contentText = scrapedContent.markdown || "";

  if (!contentText) {
    throw new Error("No content extracted from link");
  }

  const sizeBytes = new TextEncoder().encode(contentText).length;

  try {
    datasourceId = await createDatasourceRecord({
      chatbotId,
      organizationId,
      sourceName: url,
      sourceType: "link",
      url,
      sizeBytes,
      mimeType: normalizeMimeType(url),
      contentHash: urlHash,
    });
  } catch (error) {
    console.error("Failed to create datasource record for link:", error);
    return {
      url,
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Failed to initialize ingestion record",
    };
  }

  try {
    const contentHash = hashText(contentText);
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
      mimeType: "text/markdown",
    });

    await incrementChatbotDatasourceCount(chatbotId, organizationId);

    return {
      url,
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error(`Failed to ingest link ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await markDatasourceFailed(datasourceId, errorMessage);

    return {
      url,
      datasourceId,
      status: "failed",
      chunkCount: 0,
      message: errorMessage,
    };
  }
}
