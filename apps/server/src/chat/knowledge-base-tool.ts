import { tool } from "ai";
import { getPgPool } from "@padyna/db";
import { z } from "zod";
import { retrieveHybridChunks, type HybridRetrievalMetrics } from "../search/hybrid-retrieval";
import { estimateContentTokens } from "../ingestion/chunking";

const DEFAULT_RESULTS = 6;
const MAX_RESULTS = 10;
const MAX_WEIGHT_PER_SOURCE = 3;
const MAX_CONTEXT_TOKENS = 2_400;

function clampResults(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_RESULTS;
  }

  return Math.max(1, Math.min(limit, MAX_RESULTS));
}

interface CreateKnowledgeBaseToolInput {
  chatbotId: string;
  organizationId: string;
}

async function incrementReferencedDatasources(
  chatbotId: string,
  organizationId: string,
  rows: Array<{ datasourceId: string }>,
) {
  if (rows.length === 0) {
    return;
  }

  const datasourceChunkCounts = new Map<string, number>();

  for (const row of rows) {
    datasourceChunkCounts.set(
      row.datasourceId,
      (datasourceChunkCounts.get(row.datasourceId) ?? 0) + 1,
    );
  }

  const updates = Array.from(datasourceChunkCounts.entries()).map(([datasourceId, count]) => ({
    datasourceId,
    increment: Math.min(count, MAX_WEIGHT_PER_SOURCE),
  }));

  if (updates.length === 0) {
    return;
  }

  const valuesClause = updates
    .map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::integer)`)
    .join(", ");
  const params = updates.flatMap(({ datasourceId, increment }) => [datasourceId, increment]);
  const chatbotParam = `$${params.length + 1}`;
  const organizationParam = `$${params.length + 2}`;

  await getPgPool().query(
    `
      update datasources as d
      set times_referenced = d.times_referenced + v.increment
      from (values ${valuesClause}) as v(id, increment)
      where d.id = v.id
        and d.chatbot_id = ${chatbotParam}::uuid
        and d.organization_id = ${organizationParam}::text
    `,
    [...params, chatbotId, organizationId],
  );
}

export function KnowledgeBaseTool(input: CreateKnowledgeBaseToolInput) {
  return tool({
    description:
      "Find the relevant information from the knowledge base to answer the user's question.",
    inputSchema: z.object({
      query: z.string().min(1).describe("What to search for in the knowledge base"),
      maxResults: z.number().int().min(1).max(MAX_RESULTS).optional(),
    }),
    execute: async ({ query, maxResults }, { abortSignal }) => {
      let retrievalMetrics: HybridRetrievalMetrics | undefined;
      const rows = await retrieveHybridChunks({
        query,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
        limit: clampResults(maxResults),
        abortSignal,
        onMetrics: (metrics) => {
          retrievalMetrics = metrics;
        },
      });

      if (
        retrievalMetrics &&
        (retrievalMetrics.totalMs > 1_000 || retrievalMetrics.degradedToFullText)
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

      if (contextRows.length > 0) {
        void incrementReferencedDatasources(
          input.chatbotId,
          input.organizationId,
          contextRows,
        ).catch((error) => {
          console.error("Failed to increment referenced datasources", error);
        });
      }

      return {
        results: contextRows.map((row) => ({
          chunkId: row.chunkId,
          datasourceId: row.datasourceId,
          sourceName: row.sourceName,
          sourceType: row.sourceType,
          url: row.url,
          content: row.content,
          semanticScore: row.semanticScore,
          fullTextScore: row.fullTextScore,
        })),
      };
    },
  });
}
