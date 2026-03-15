import { tool } from "ai";
import { db } from "@padyna/db";
import { datasources } from "@padyna/db/schema/index";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { retrieveHybridChunks } from "../search/hybrid-retrieval";

const DEFAULT_RESULTS = 6;
const MAX_RESULTS = 10;

function clampResults(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_RESULTS;
  }

  return Math.max(1, Math.min(limit, MAX_RESULTS));
}

export function createKnowledgeBaseTool(input: {
  chatbotId: string;
  organizationId: string;
}) {
  return tool({
    description:
      "Search the business knowledge base for policy, product, pricing, and support answers.",
    inputSchema: z.object({
      query: z.string().min(1).describe("What to search for in the knowledge base"),
      maxResults: z.number().int().min(1).max(MAX_RESULTS).optional(),
    }),
    execute: async ({ query, maxResults }) => {
      const rows = await retrieveHybridChunks({
        query,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
        limit: clampResults(maxResults),
      });

      const usedDatasourceIds = Array.from(new Set(rows.map((row) => row.datasourceId)));

      if (usedDatasourceIds.length > 0) {
        await db
          .update(datasources)
          .set({
            timesReferenced: sql`${datasources.timesReferenced} + 1`,
          })
          .where(
            and(
              inArray(datasources.id, usedDatasourceIds),
              eq(datasources.chatbotId, input.chatbotId),
              eq(datasources.organizationId, input.organizationId),
            ),
          );
      }

      return {
        query,
        resultCount: rows.length,
        results: rows.map((row) => ({
          chunkId: row.chunkId,
          datasourceId: row.datasourceId,
          sourceName: row.sourceName,
          sourceType: row.sourceType,
          content: row.content,
          scores: {
            fused: row.fusedScore,
            semantic: row.semanticScore,
            fullText: row.fullTextScore,
          },
          ranks: {
            semantic: row.semanticRank,
            fullText: row.fullTextRank,
          },
        })),
      };
    },
  });
}
