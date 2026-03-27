import { env } from "@padyna/env/server";
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
  const scraperUrl = env.SCRAPER_URL;

  const body: Record<string, unknown> = {
    sitemap: "include",
    crawlEntireDomain: options.crawlEntireDomain ?? false,
    limit: options.limit ?? 10,
    scrapeOptions: {
      onlyMainContent: false,
      maxAge: 172800000,
      formats: ["markdown"],
    },
  };

  if (options.includePaths && options.includePaths.length > 0) {
    body.includePaths = options.includePaths;
  }

  const response = await fetch(`${scraperUrl}/v2/crawl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
  const scraperUrl = env.SCRAPER_URL;

  const response = await fetch(`${scraperUrl}/v2/crawl/${crawlId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new CrawlError(`Failed to get crawl status: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as CrawlStatusResponse;

  return result;
}

export async function cancelCrawl(crawlId: string): Promise<{ status: string }> {
  const scraperUrl = env.SCRAPER_URL;

  const response = await fetch(`${scraperUrl}/v2/crawl/${crawlId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new CrawlError(`Failed to cancel crawl: ${response.statusText}`, response.status);
  }

  return { status: "cancelled" };
}
