import { Buffer } from "node:buffer";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

import type { ExtractedFileContent, SupportedFileExtension } from "./types";

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

  let contentText = "";

  if (fileExtension === "pdf") {
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(pdfBuffer);
    contentText = (parsed.text ?? "").trim();
  } else if (fileExtension === "docx") {
    const docxBuffer = Buffer.from(await file.arrayBuffer());
    const parsed = await mammoth.extractRawText({ buffer: docxBuffer });
    contentText = (parsed.value ?? "").trim();
  } else {
    contentText = (await file.text()).trim();
  }

  if (!contentText) {
    throw new Error(`File ${file.name} is empty.`);
  }

  return {
    contentText,
    fileExtension,
    mimeType: file.type || "application/octet-stream",
  };
}
