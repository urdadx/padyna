export type CrawlStatus = "active" | "completed" | "failed" | "cancelled";

export interface CrawlPageData {
  markdown: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  metadata: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    url: string;
    keywords?: string;
    statusCode?: number;
    error?: string;
    [key: string]: unknown;
  };
}

export interface CrawlStatusResponse {
  success: boolean;
  status: CrawlStatus;
  total: number;
  completed: number;
  creditsUsed: number;
  expiresAt: string;
  next?: string;
  data: CrawlPageData[];
}

export interface StartCrawlResponse {
  success: boolean;
  id: string;
  url: string;
}

export interface CrawlInput {
  url: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  includePaths?: string[];
  crawlEntireDomain?: boolean;
}

export interface CrawlResult {
  crawlId: string;
  url: string;
  status: CrawlStatus;
  totalPages: number;
  completedPages: number;
}

export interface ProcessedCrawlResult {
  crawlId: string;
  datasourceIds: string[];
  status: "success" | "failed";
  totalChunks: number;
  message?: string;
}
