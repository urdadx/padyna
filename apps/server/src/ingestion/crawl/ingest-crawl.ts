import { chunkText, estimateContentTokens } from "../chunking";
import { embedTexts } from "../embeddings";
import { hashText } from "../file/hash";
import { getCrawlStatus } from "./run-crawl";
import type { CrawlInput, CrawlResult, ProcessedCrawlResult } from "./types";
import {
  createDatasourceRecord,
  incrementChatbotDatasourceCount,
  markDatasourceFailed,
  replaceDatasourceChunksAndMarkSynced,
} from "@padyna/db/ingestion-files";
import { startCrawl } from "./run-crawl";
import { mapWithConcurrency } from "../../lib/concurrency";

const CRAWL_PAGE_CONCURRENCY = 4;

function normalizeMimeType(url: string) {
  if (url.endsWith(".pdf")) return "application/pdf";
  return "text/html";
}

export async function ingestCrawl(input: CrawlInput): Promise<CrawlResult> {
  const { url, limit, includePaths, crawlEntireDomain } = input;

  const { id: crawlId } = await startCrawlWithOptions({
    url,
    limit,
    includePaths,
    crawlEntireDomain,
  });

  return {
    crawlId,
    url,
    status: "active",
    totalPages: 0,
    completedPages: 0,
  };
}

async function startCrawlWithOptions(options: {
  url: string;
  limit?: number;
  includePaths?: string[];
  crawlEntireDomain?: boolean;
}) {
  return startCrawl(options);
}

export async function processCompletedCrawl(
  crawlId: string,
  chatbotId: string,
  organizationId: string,
): Promise<ProcessedCrawlResult> {
  const statusResponse = await getCrawlStatus(crawlId);

  if (statusResponse.status !== "completed") {
    return {
      crawlId,
      datasourceIds: [],
      status: "failed",
      totalChunks: 0,
      message: `Crawl status is ${statusResponse.status}, not completed`,
    };
  }

  const datasourceIds: string[] = [];
  let totalChunks = 0;

  // Pages are independent, so a few run at once instead of one after another
  // (each page is a record insert, an embedding call and a chunk write).
  await mapWithConcurrency(statusResponse.data, CRAWL_PAGE_CONCURRENCY, async (pageData) => {
    if (!pageData.markdown) {
      return;
    }

    const pageUrl = pageData.metadata?.url || pageData.metadata?.sourceURL || "";
    const urlHash = hashText(pageUrl);

    let datasourceId: string;
    try {
      datasourceId = await createDatasourceRecord({
        chatbotId,
        organizationId,
        sourceName: pageData.metadata?.title || pageUrl,
        sourceType: "link",
        url: pageUrl,
        sizeBytes: pageData.markdown.length,
        mimeType: normalizeMimeType(pageUrl),
        contentHash: urlHash,
      });
    } catch (error) {
      console.error("Failed to create datasource record for crawl page:", error);
      return;
    }

    try {
      const contentText = pageData.markdown;
      const contentHash = hashText(contentText);
      const charCount = contentText.length;
      const tokenCount = estimateContentTokens(contentText);

      const chunks = chunkText(contentText);
      const chunkTitle = pageData.metadata?.title || pageUrl;

      if (chunks.length === 0) {
        await markDatasourceFailed(datasourceId, "No chunks created from content");
        return;
      }

      const {
        embeddings: embeddingVectors,
        dimensions,
        model,
      } = await embedTexts(
        chunks.map((chunk) => `${chunkTitle}\n\n${chunk.content}`),
        { reuseFromDatasourceId: datasourceId },
      );

      await replaceDatasourceChunksAndMarkSynced(
        chunks.map((chunk, index) => ({
          datasourceId: datasourceId,
          chatbotId,
          organizationId,
          chunkIndex: chunk.chunkIndex,
          title: chunkTitle,
          content: chunk.content,
          contentHash: hashText(chunk.content),
          tokenCount: chunk.tokenCount,
          charCount: chunk.charCount,
          embedding: embeddingVectors[index]!,
          embeddingModel: model,
          embeddingDimensions: dimensions,
        })),
        {
          datasourceId,
          contentText,
          contentHash,
          tokenCount,
          charCount,
          chunkCount: chunks.length,
          mimeType: "text/markdown",
        },
      );

      datasourceIds.push(datasourceId);
      totalChunks += chunks.length;
    } catch (error) {
      console.error(`Failed to process crawl page ${pageUrl}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await markDatasourceFailed(datasourceId, errorMessage);
    }
  });

  if (datasourceIds.length > 0) {
    await incrementChatbotDatasourceCount(chatbotId, organizationId);
  }

  return {
    crawlId,
    datasourceIds,
    status: "success",
    totalChunks,
  };
}

export async function checkCrawlStatus(crawlId: string): Promise<CrawlResult> {
  const statusResponse = await getCrawlStatus(crawlId);

  return {
    crawlId,
    url: statusResponse.data[0]?.metadata?.sourceURL || "",
    status: statusResponse.status,
    totalPages: statusResponse.total,
    completedPages: statusResponse.completed,
  };
}
