import { FIRECRAWL_API_URL, getFirecrawlHeaders } from "../firecrawl";
import { type ScrapedContent } from "./types";

interface ScrapeResponse {
  success: boolean;
  data: ScrapedContent;
}

export class ScrapeError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "ScrapeError";
  }
}

export async function runLinkScrape(url: string): Promise<ScrapedContent> {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/scrape`, {
    method: "POST",
    headers: getFirecrawlHeaders(),
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      maxAge: 172800000,
    }),
  });

  if (!response.ok) {
    throw new ScrapeError(`Failed to scrape URL: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as ScrapeResponse;

  if (!result.success || !result.data) {
    throw new ScrapeError("Scraping failed or returned no data");
  }

  return result.data;
}
