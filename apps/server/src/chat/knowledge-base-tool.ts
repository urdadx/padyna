import { tool } from "ai";
import { z } from "zod";
import { retrieveChunks, type RetrievalMetrics } from "../search/retrieval";
import { estimateContentTokens } from "../ingestion/chunking";
import { recordDatasourceReferences } from "./datasource-references";

export const KNOWLEDGE_BASE_TOOL_NAME = "knowledge_base";

const DEFAULT_RESULTS = 6;
const MAX_RESULTS = 10;
const MAX_CONTEXT_TOKENS = 2_400;

function clampResults(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_RESULTS;
  }

  return Math.max(1, Math.min(limit, MAX_RESULTS));
}

interface KnowledgeBaseScope {
  chatbotId: string;
  organizationId: string;
}

/**
 * What the model sees for each result. Only fields the model or the source
 * citations in the UI read: ids and scores cost tokens on every answer.
 */
export interface KnowledgeBaseResult {
  sourceName: string;
  sourceType: string;
  url?: string;
  content: string;
}

export interface KnowledgeBaseOutput {
  results: KnowledgeBaseResult[];
}

export async function searchKnowledgeBase(
  input: KnowledgeBaseScope & { query: string; maxResults?: number; abortSignal?: AbortSignal },
): Promise<KnowledgeBaseOutput> {
  let retrievalMetrics: RetrievalMetrics | undefined;
  const rows = await retrieveChunks({
    query: input.query,
    chatbotId: input.chatbotId,
    organizationId: input.organizationId,
    limit: clampResults(input.maxResults),
    abortSignal: input.abortSignal,
    onMetrics: (metrics) => {
      retrievalMetrics = metrics;
    },
  });

  if (
    retrievalMetrics &&
    (retrievalMetrics.totalMs > 1_000 || retrievalMetrics.fullTextFallback === "semantic_failed")
  ) {
    console.info("Knowledge base retrieval metrics", retrievalMetrics);
  }

  let contextTokens = 0;
  const contextRows = rows.filter((row) => {
    const rowTokens = estimateContentTokens(row.content);
    if (contextTokens > 0 && contextTokens + rowTokens > MAX_CONTEXT_TOKENS) {
      return false;
    }
    contextTokens += rowTokens;
    return true;
  });

  recordDatasourceReferences(
    input.chatbotId,
    input.organizationId,
    contextRows.map((row) => row.datasourceId),
  );

  return {
    results: contextRows.map((row) => ({
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      ...(row.url ? { url: row.url } : {}),
      content: row.content,
    })),
  };
}

export function KnowledgeBaseTool(input: KnowledgeBaseScope) {
  return tool({
    description:
      "Find the relevant information from the knowledge base to answer the user's question.",
    inputSchema: z.object({
      query: z.string().min(1).describe("What to search for in the knowledge base"),
      maxResults: z.number().int().min(1).max(MAX_RESULTS).optional(),
    }),
    execute: ({ query, maxResults }, { abortSignal }) =>
      searchKnowledgeBase({ ...input, query, maxResults, abortSignal }),
  });
}
