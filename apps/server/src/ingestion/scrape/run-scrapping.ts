import { env } from "@padyna/env/server";
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
  const scraperUrl = env.SCRAPER_URL;

  const response = await fetch(`${scraperUrl}/v2/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
