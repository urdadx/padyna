export const SUPPORTED_FILE_EXTENSIONS = ["pdf", "csv", "txt", "docx", "md", "mdx"] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

export type FileIngestStatus = "synced" | "failed";

export interface ExtractedFileContent {
  contentText: string;
  fileExtension: SupportedFileExtension | null;
  mimeType: string;
}

export interface TextChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  charCount: number;
}

export interface IngestedFileResult {
  fileName: string;
  datasourceId: string;
  status: FileIngestStatus;
  chunkCount: number;
  message?: string;
}

export interface IngestFilesInput {
  files: File[];
  chatbotId: string;
  organizationId: string;
}

export interface IngestFilesOutput {
  results: IngestedFileResult[];
}
