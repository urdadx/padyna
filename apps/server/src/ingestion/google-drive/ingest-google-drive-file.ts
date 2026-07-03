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
import { convertFileWithMarkItDown } from "../file/markitdown";
import {
  GOOGLE_DOC_MIME_TYPE,
  type GoogleDriveFile,
} from "../../integrations/google-drive/auth/client";

export interface IngestGoogleDriveFileInput {
  file: GoogleDriveFile;
  content: ArrayBuffer;
  chatbotId: string;
  organizationId: string;
  accountId?: string | null;
  accountEmail?: string | null;
}

export interface IngestedGoogleDriveFileResult {
  fileId: string;
  fileName: string;
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

function getNormalizedMimeType(file: GoogleDriveFile) {
  const name = file.name.toLowerCase();
  if (file.mimeType === GOOGLE_DOC_MIME_TYPE || name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".md")) {
    return "text/markdown";
  }
  return file.mimeType || "application/octet-stream";
}

async function extractTextFromGoogleDriveFile(file: GoogleDriveFile, content: ArrayBuffer) {
  const mimeType = getNormalizedMimeType(file);
  const markdown = await convertFileWithMarkItDown(
    new File([content], file.name, { type: mimeType }),
  );

  if (!markdown) {
    throw new Error(`MarkItDown could not extract content from ${file.name}`);
  }

  return markdown;
}

export async function ingestGoogleDriveFile(
  input: IngestGoogleDriveFileInput,
): Promise<IngestedGoogleDriveFileResult> {
  let datasourceId = "";

  try {
    const contentText = await extractTextFromGoogleDriveFile(input.file, input.content);

    if (!contentText) {
      return {
        fileId: input.file.id,
        fileName: input.file.name,
        datasourceId: "",
        status: "failed",
        chunkCount: 0,
        message: "Google Drive file has no extractable content",
      };
    }

    const contentHash = hashText(contentText);
    const sizeBytes = Number(input.file.size ?? new TextEncoder().encode(contentText).length);
    const mimeType = getNormalizedMimeType(input.file);

    datasourceId = await createDatasourceRecord({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      sourceName: input.file.name,
      sourceType: "google_drive",
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
      contentHash,
      url: input.file.webViewLink ?? `google-drive:${input.file.id}`,
      mimeType,
      sourceConfig: {
        provider: "google_drive",
        fileId: input.file.id,
        accountId: input.accountId ?? null,
        accountEmail: input.accountEmail ?? null,
      },
      providerPayload: {
        id: input.file.id,
        name: input.file.name,
        mimeType: input.file.mimeType,
        modifiedTime: input.file.modifiedTime ?? null,
        parents: input.file.parents ?? [],
        webViewLink: input.file.webViewLink ?? null,
      },
    });

    const chunks = chunkText(contentText);
    const { embeddings, dimensions } = await embedTexts(chunks.map((chunk) => chunk.content));

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
        embedding: embeddings[index] ?? [],
        embeddingDimensions: dimensions,
      })),
    );

    await markDatasourceSynced({
      datasourceId,
      contentText,
      contentHash,
      tokenCount: estimateContentTokens(contentText),
      charCount: contentText.length,
      chunkCount: chunks.length,
      mimeType,
    });

    await incrementChatbotDatasourceCount(input.chatbotId, input.organizationId);

    return {
      fileId: input.file.id,
      fileName: input.file.name,
      datasourceId,
      status: "synced",
      chunkCount: chunks.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive ingestion failed";
    if (datasourceId) {
      await markDatasourceFailed(datasourceId, message);
    }

    return {
      fileId: input.file.id,
      fileName: input.file.name,
      datasourceId,
      status: "failed",
      chunkCount: 0,
      message,
    };
  }
}
