import { excludedLegalPathPatterns } from "../excluded-legal-paths";
import { FIRECRAWL_API_URL, getFirecrawlHeaders } from "../firecrawl";
import type { CrawlStatusResponse, StartCrawlResponse } from "./types";

export class CrawlError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "CrawlError";
  }
}

interface StartCrawlOptions {
  url: string;
  limit?: number;
  includePaths?: string[];
  crawlEntireDomain?: boolean;
}

export async function startCrawl(options: StartCrawlOptions): Promise<StartCrawlResponse> {
  const body: Record<string, unknown> = {
    sitemap: "include",
    excludePaths: excludedLegalPathPatterns,
    crawlEntireDomain: options.crawlEntireDomain ?? false,
    limit: options.limit ?? 100,
    scrapeOptions: {
      onlyMainContent: false,
      maxAge: 172800000,
      formats: ["markdown"],
    },
  };

  if (options.includePaths && options.includePaths.length > 0) {
    body.includePaths = options.includePaths;
  }

  const response = await fetch(`${FIRECRAWL_API_URL}/v2/crawl`, {
    method: "POST",
    headers: getFirecrawlHeaders(),
    body: JSON.stringify({
      url: options.url,
      ...body,
    }),
  });

  if (!response.ok) {
    throw new CrawlError(`Failed to start crawl: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as StartCrawlResponse;

  if (!result.success) {
    throw new CrawlError("Crawl initialization failed");
  }

  return result;
}

export async function getCrawlStatus(crawlId: string): Promise<CrawlStatusResponse> {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/crawl/${crawlId}`, {
    method: "GET",
    headers: getFirecrawlHeaders(),
  });

  if (!response.ok) {
    throw new CrawlError(`Failed to get crawl status: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as CrawlStatusResponse;

  return result;
}

export async function cancelCrawl(crawlId: string): Promise<{ status: string }> {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/crawl/${crawlId}`, {
    method: "DELETE",
    headers: getFirecrawlHeaders(),
  });

  if (!response.ok) {
    throw new CrawlError(`Failed to cancel crawl: ${response.statusText}`, response.status);
  }

  return { status: "cancelled" };
}
