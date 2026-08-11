import { isExcludedLegalPath } from "../excluded-legal-paths";
import { FIRECRAWL_API_URL, getFirecrawlHeaders } from "../firecrawl";

interface MapLink {
  url: string;
  title?: string;
  description?: string;
}

interface MapResponse {
  success: boolean;
  links: MapLink[];
}

export class MapError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "MapError";
  }
}

export async function runMapWebsite(url: string, search?: string): Promise<MapLink[]> {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/map`, {
    method: "POST",
    headers: getFirecrawlHeaders(),
    body: JSON.stringify({
      url,
      search,
      sitemap: "include",
      includeSubdomains: true,
      ignoreQueryParameters: true,
      limit: 100,
    }),
  });

  if (!response.ok) {
    throw new MapError(`Failed to map website: ${response.statusText}`, response.status);
  }

  const result = (await response.json()) as MapResponse;

  if (!result.success || !result.links) {
    throw new MapError("Mapping failed or returned no data");
  }

  return result.links.filter((link) => !isExcludedLegalPath(link.url));
}
