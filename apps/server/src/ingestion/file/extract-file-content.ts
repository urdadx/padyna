import type { ExtractedFileContent, SupportedFileExtension } from "./types";
import { convertFileWithMarkItDown } from "./markitdown";

function getExtension(fileName: string): SupportedFileExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
    case "csv":
    case "txt":
    case "docx":
    case "md":
    case "mdx":
      return extension;
    default:
      return null;
  }
}

export async function extractFileContent(file: File): Promise<ExtractedFileContent> {
  const fileExtension = getExtension(file.name);

  if (!fileExtension) {
    throw new Error(`Unsupported file extension for ${file.name}`);
  }

  const contentText = (await convertFileWithMarkItDown(file))?.trim() ?? "";

  if (!contentText) {
    throw new Error(`MarkItDown could not extract content from ${file.name}.`);
  }

  return {
    contentText,
    fileExtension,
    mimeType: file.type || "application/octet-stream",
  };
}
