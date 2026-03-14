import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { extractFileContent } from "./extract-file-content";
import { hashFile, hashText } from "./hash";
import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  insertDatasourceChunks,
  markDatasourceFailed,
  markDatasourceSynced,
} from "@padyna/db/ingestion-files";
import type { IngestFilesInput, IngestFilesOutput, IngestedFileResult } from "./types";

function normalizeMimeType(mimeType: string, fileExtension: string | null) {
  if (mimeType) {
    return mimeType;
  }

  if (!fileExtension) {
    return "application/octet-stream";
  }

  switch (fileExtension) {
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "md":
    case "mdx":
      return "text/markdown";
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

async function ingestSingleFile(
  file: File,
  chatbotId: string,
  organizationId: string,
): Promise<IngestedFileResult> {
  const fileHash = await hashFile(file);
  const datasourceId = await createDatasourceRecord({
    chatbotId,
    organizationId,
    sourceName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    fileHash,
  });

  try {
    const extracted = await extractFileContent(file);
    const contentText = extracted.contentText;

    const chunks = chunkText(contentText);
    const { embeddings, dimensions } = await embedTexts(chunks.map((chunk) => chunk.content));

    if (chunks.length > 0) {
      await insertDatasourceChunks(
        chunks.map((chunk, index) => ({
          datasourceId,
          chatbotId,
          organizationId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          contentHash: hashText(chunk.content),
          tokenCount: chunk.tokenCount,
          charCount: chunk.charCount,
          embedding: embeddings[index] ?? [],
          embeddingDimensions: dimensions,
        })),
      );
    }

    await markDatasourceSynced({
      datasourceId,
      contentText,
      contentHash: hashText(contentText),
      tokenCount: estimateContentTokens(contentText),
      charCount: contentText.length,
      chunkCount: chunks.length,
      mimeType: normalizeMimeType(extracted.mimeType, extracted.fileExtension),
    });

    await incrementChatbotDatasourceCount(chatbotId, organizationId);

    return {
      fileName: file.name,
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "File ingestion failed.";

    await markDatasourceFailed(datasourceId, message);

    return {
      fileName: file.name,
      datasourceId,
      status: "failed",
      chunkCount: 0,
      message,
    };
  }
}

export async function ingestFiles(input: IngestFilesInput): Promise<IngestFilesOutput> {
  const results: IngestedFileResult[] = [];

  for (const file of input.files) {
    const result = await ingestSingleFile(file, input.chatbotId, input.organizationId);
    results.push(result);
  }

  return { results };
}
