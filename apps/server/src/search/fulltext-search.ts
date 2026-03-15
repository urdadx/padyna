import { db } from "@padyna/db";
import { datasources } from "@padyna/db/schema/index";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export interface RankedFullTextDatasource {
  datasourceId: string;
  score: number;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text";
  ingestStatus: "pending" | "processing" | "synced" | "failed" | "archived";
}

export interface SearchDatasourcesByFullTextInput {
  query: string;
  chatbotId: string;
  organizationId: string;
  limit?: number;
  includeUnsynced?: boolean;
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

export async function searchDatasourcesByFullText(
  input: SearchDatasourcesByFullTextInput,
): Promise<RankedFullTextDatasource[]> {
  const normalizedQuery = normalizeQuery(input.query);

  if (!normalizedQuery) {
    return [];
  }

  const limit = clampLimit(input.limit);
  const tsQuery = sql`websearch_to_tsquery('simple', ${normalizedQuery})`;
  const searchVector = sql`
    setweight(to_tsvector('simple', coalesce(${datasources.sourceName}, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(${datasources.question}, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(${datasources.answer}, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(${datasources.contentText}, '')), 'B')
  `;
  const rank = sql<number>`ts_rank_cd(${searchVector}, ${tsQuery})`;

  const rows = await db
    .select({
      datasourceId: datasources.id,
      sourceName: datasources.sourceName,
      sourceType: datasources.sourceType,
      ingestStatus: datasources.ingestStatus,
      score: rank,
    })
    .from(datasources)
    .where(
      and(
        eq(datasources.chatbotId, input.chatbotId),
        eq(datasources.organizationId, input.organizationId),
        isNull(datasources.deletedAt),
        input.includeUnsynced ? undefined : eq(datasources.ingestStatus, "synced"),
        sql`${searchVector} @@ ${tsQuery}`,
      ),
    )
    .orderBy(desc(rank), desc(datasources.updatedAt))
    .limit(limit);

  return rows;
}
