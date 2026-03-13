export const SUPPORTED_LINK_PROTOCOLS = ["http", "https"] as const;

export type SupportedLinkProtocol = (typeof SUPPORTED_LINK_PROTOCOLS)[number];

export type LinkIngestStatus = "synced" | "failed";

export interface ScrapedContent {
  markdown: string;
  summary?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    [key: string]: any;
  };
  warning?: string;
}

export interface IngestedLinkResult {
  url: string;
  datasourceId: string;
  status: LinkIngestStatus;
  chunkCount: number;
  message?: string;
}

export interface IngestLinkInput {
  url: string;
  chatbotId: string;
  organizationId: string;
}

export interface IngestLinkOutput {
  results: IngestedLinkResult[];
}
