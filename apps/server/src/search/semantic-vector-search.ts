import { db } from "@padyna/db";
import { datasourceChunks, datasources } from "@padyna/db/schema/index";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { embedTextForSemanticSearch } from "./semantic-search";

export interface RankedSemanticChunk {
  chunkId: string;
  datasourceId: string;
  score: number;
  content: string;
  chunkIndex: number;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text";
}

export interface SearchSemanticChunksInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  datasourceIds?: string[];
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(limit, MAX_LIMIT));
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function searchSemanticChunks(input: SearchSemanticChunksInput) {
  const normalizedQuery = normalizeQuery(input.query);
  if (!normalizedQuery) {
    return [] as RankedSemanticChunk[];
  }

  const queryEmbedding = await embedTextForSemanticSearch(normalizedQuery);
  const vectorLiteral = embeddingToVectorLiteral(queryEmbedding);
  const limit = clampLimit(input.limit);

  const distance = sql<number>`${datasourceChunks.embedding} <=> ${vectorLiteral}::vector`;
  const score = sql<number>`1 - (${distance})`;

  const rows = await db
    .select({
      chunkId: datasourceChunks.id,
      datasourceId: datasourceChunks.datasourceId,
      score,
      content: datasourceChunks.content,
      chunkIndex: datasourceChunks.chunkIndex,
      sourceName: datasources.sourceName,
      sourceType: datasources.sourceType,
    })
    .from(datasourceChunks)
    .innerJoin(datasources, eq(datasourceChunks.datasourceId, datasources.id))
    .where(
      and(
        eq(datasourceChunks.chatbotId, input.chatbotId),
        eq(datasourceChunks.organizationId, input.organizationId),
        eq(datasources.ingestStatus, "synced"),
        isNull(datasources.deletedAt),
        isNotNull(datasourceChunks.embedding),
        input.datasourceIds && input.datasourceIds.length > 0
          ? inArray(datasourceChunks.datasourceId, input.datasourceIds)
          : undefined,
      ),
    )
    .orderBy(desc(score))
    .limit(limit);

  return rows;
}
