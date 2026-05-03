import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";
import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";

export interface IngestNotionPageInput {
  pageId: string;
  title: string;
  markdown: string;
  chatbotId: string;
  organizationId: string;
  workspaceId: string;
  workspaceName?: string | null;
  url?: string | null;
  truncated?: boolean;
  unknownBlockIds?: string[];
}

export interface IngestedNotionPageResult {
  pageId: string;
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

export async function ingestNotionPage(
  input: IngestNotionPageInput,
): Promise<IngestedNotionPageResult> {
  const content = input.markdown.trim();

  if (!content) {
    return {
      pageId: input.pageId,
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Notion page has no markdown content",
    };
  }

  const contentHash = hashText(content);
  const sizeBytes = new TextEncoder().encode(content).length;
  let datasourceId = "";

  try {
    datasourceId = await createDatasourceRecord({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      sourceName: input.title || "Untitled Notion page",
      sourceType: "notion",
      sizeBytes,
      contentHash,
      url: input.url ?? `notion:${input.pageId}`,
      mimeType: "text/markdown",
      sourceConfig: {
        provider: "notion",
        pageId: input.pageId,
        workspaceId: input.workspaceId,
        workspaceName: input.workspaceName ?? null,
      },
      providerPayload: {
        pageId: input.pageId,
        truncated: input.truncated ?? false,
        unknownBlockIds: input.unknownBlockIds ?? [],
      },
    });
  } catch (error) {
    console.error("Failed to create Notion datasource record:", error);
    return {
      pageId: input.pageId,
      datasourceId: "",
      status: "failed",
      chunkCount: 0,
      message: "Failed to initialize Notion datasource record",
    };
  }

  try {
    const charCount = content.length;
    const tokenCount = estimateContentTokens(content);
    const chunks = chunkText(content);
    const { embeddings: embeddingVectors, dimensions } = await embedTexts(
      chunks.map((chunk) => chunk.content),
    );

    await insertDatasourceChunks(
      chunks.map((chunk, index) => ({
        datasourceId,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
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
      contentText: content,
      contentHash,
      tokenCount,
      charCount,
      chunkCount: chunks.length,
      mimeType: "text/markdown",
    });

    await incrementChatbotDatasourceCount(input.chatbotId, input.organizationId);

    return {
      pageId: input.pageId,
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error("Failed to ingest Notion page:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await markDatasourceFailed(datasourceId, message);

    return {
      pageId: input.pageId,
      datasourceId,
      status: "failed",
      chunkCount: 0,
      message,
    };
  }
}
