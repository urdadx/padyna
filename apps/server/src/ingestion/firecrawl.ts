import { env } from "@padyna/env/server";

export const FIRECRAWL_API_URL = "https://api.firecrawl.dev";

export function getFirecrawlHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(env.FIRECRAWL_API_KEY
      ? { Authorization: `Bearer ${env.FIRECRAWL_API_KEY}` }
      : {}),
  };
}
