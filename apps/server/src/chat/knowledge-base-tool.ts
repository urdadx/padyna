import { tool } from "ai";
import { db } from "@padyna/db";
import { datasources } from "@padyna/db/schema/index";
import { and, eq, sql } from "drizzle-orm";
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

interface CreateKnowledgeBaseToolInput {
  chatbotId: string;
  organizationId: string;
}

export function KnowledgeBaseTool(input: CreateKnowledgeBaseToolInput) {
  return tool({
    description:
      "Find the relevant information from the knowledge base to answer the user's question.",
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

      const datasourceChunkCounts = new Map<string, number>();

      for (const row of rows) {
        if (row.datasourceId) {
          datasourceChunkCounts.set(
            row.datasourceId,
            (datasourceChunkCounts.get(row.datasourceId) ?? 0) + 1,
          );
        }
      }

      const MAX_WEIGHT_PER_SOURCE = 3;

      if (datasourceChunkCounts.size > 0) {
        const updates = Array.from(datasourceChunkCounts.entries()).map(
          ([datasourceId, count]) => ({
            datasourceId,
            increment: Math.min(count, MAX_WEIGHT_PER_SOURCE),
          }),
        );

        for (const { datasourceId, increment } of updates) {
          await db
            .update(datasources)
            .set({
              timesReferenced: sql`${datasources.timesReferenced} + ${increment}`,
            })
            .where(
              and(
                eq(datasources.id, datasourceId),
                eq(datasources.chatbotId, input.chatbotId),
                eq(datasources.organizationId, input.organizationId),
              ),
            );
        }
      }

      return {
        query,
        resultCount: rows.length,
        results: rows.map((row) => ({
          chunkId: row.chunkId,
          datasourceId: row.datasourceId,
          sourceName: row.sourceName,
          sourceType: row.sourceType,
          url: row.url,
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
