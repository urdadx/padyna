import { tool } from "ai";
import { getPgPool } from "@padyna/db";
import { z } from "zod";
import { retrieveHybridChunks } from "../search/hybrid-retrieval";

const DEFAULT_RESULTS = 6;
const MAX_RESULTS = 10;
const MAX_WEIGHT_PER_SOURCE = 3;

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
    execute: async ({ query, maxResults }) => {
      const rows = await retrieveHybridChunks({
        query,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
        limit: clampResults(maxResults),
      });

      if (rows.length > 0) {
        void incrementReferencedDatasources(input.chatbotId, input.organizationId, rows).catch(
          (error) => {
            console.error("Failed to increment referenced datasources", error);
          },
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
