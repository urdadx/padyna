import { db } from "@padyna/db";
import { visitorEvents, visitorSessions } from "@padyna/db/schema/index";
import { and, avg, count, countDistinct, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { analyticsEvents } from "./events";
import {
  chartBucketUnit,
  clampDurationMs,
  computeBounceRate,
  getDateRange,
  splitBreakdowns,
  type BreakdownRow,
  type Breakdowns,
  type TimeRange,
} from "./analytics-utils";

// Analytics queries shared by the tRPC router and the server's live overview
// stream, plus the pure helpers behind them.

export * from "./analytics-utils";

/**
 * The range as UTC ISO strings for raw SQL. Timestamps are stored as UTC wall
 * time without a zone; node-postgres would send a Date as local time instead.
 */
function utcRange(timeRange: TimeRange) {
  const { start, end } = getDateRange(timeRange);
  return { start: start.toISOString(), end: end.toISOString() };
}

const n = (value: unknown) => Number(value ?? 0);

/** The shared database or a transaction (tests run against a rolled-back one). */
export type AnalyticsDb = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type OverviewStats = {
  totalVisits: number;
  uniqueVisitors: number;
  totalChats: number;
  /** Seconds. */
  averageSessionTime: number;
  /** 0..1. */
  bounceRate: number;
};

export async function getOverviewStats(
  chatbotId: string,
  timeRange: TimeRange,
  executor: AnalyticsDb = db,
): Promise<OverviewStats> {
  const { start, end } = getDateRange(timeRange);

  const [[sessions], [chats]] = await Promise.all([
    executor
      .select({
        totalVisits: count(),
        uniqueVisitors: countDistinct(visitorSessions.visitorId),
        averageDurationMs: avg(visitorSessions.durationMs),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      ),
    executor
      .select({
        totalChats: count(),
        sessionsWithChat: countDistinct(visitorEvents.sessionId),
      })
      .from(visitorEvents)
      .where(
        and(
          eq(visitorEvents.chatbotId, chatbotId),
          eq(visitorEvents.event, "chat_started"),
          gte(visitorEvents.timestamp, start),
          lte(visitorEvents.timestamp, end),
        ),
      ),
  ]);

  const totalVisits = n(sessions?.totalVisits);
  return {
    totalVisits,
    uniqueVisitors: n(sessions?.uniqueVisitors),
    totalChats: n(chats?.totalChats),
    averageSessionTime: Math.round(n(sessions?.averageDurationMs) / 1000),
    bounceRate: computeBounceRate(totalVisits, n(chats?.sessionsWithChat)),
  };
}

export type ChartPoint = { date: string; visitors: number; chats: number };

/**
 * Visits and chats started per hour (24h) or day, with empty buckets filled
 * in, so the chart's time axis is to scale. Each table is aggregated on its
 * own (chatbot, time) index; `date` is the bucket start in UTC (ISO).
 */
export async function getChartSeries(
  chatbotId: string,
  timeRange: TimeRange,
  executor: AnalyticsDb = db,
): Promise<ChartPoint[]> {
  const { start, end } = utcRange(timeRange);
  const unit = chartBucketUnit(timeRange);
  const step = unit === "hour" ? sql.raw("interval '1 hour'") : sql.raw("interval '1 day'");
  const trunc = sql.raw(`'${unit}'`);

  const result = await executor.execute<{ bucket: Date | string; visitors: string; chats: string }>(sql`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${trunc}, ${start}::timestamp),
        date_trunc(${trunc}, ${end}::timestamp),
        ${step}
      ) AS bucket
    ),
    visits AS (
      SELECT date_trunc(${trunc}, ${visitorSessions.startedAt}) AS bucket, count(*) AS visitors
      FROM ${visitorSessions}
      WHERE ${visitorSessions.chatbotId} = ${chatbotId}
        AND ${visitorSessions.startedAt} BETWEEN ${start} AND ${end}
      GROUP BY 1
    ),
    chats AS (
      SELECT date_trunc(${trunc}, ${visitorEvents.timestamp}) AS bucket, count(*) AS chats
      FROM ${visitorEvents}
      WHERE ${visitorEvents.chatbotId} = ${chatbotId}
        AND ${visitorEvents.event} = 'chat_started'
        AND ${visitorEvents.timestamp} BETWEEN ${start} AND ${end}
      GROUP BY 1
    )
    SELECT buckets.bucket,
      coalesce(visits.visitors, 0) AS visitors,
      coalesce(chats.chats, 0) AS chats
    FROM buckets
    LEFT JOIN visits USING (bucket)
    LEFT JOIN chats USING (bucket)
    ORDER BY buckets.bucket
  `);

  return result.rows.map((row) => ({
    date: toUtcIso(row.bucket),
    visitors: n(row.visitors),
    chats: n(row.chats),
  }));
}

/** `timestamp without time zone` values are UTC; mark them as such. */
function toUtcIso(value: Date | string): string {
  if (value instanceof Date) {
    // node-postgres reads zone-less timestamps as local time; undo that.
    return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString();
  }
  return new Date(`${value.replace(" ", "T")}Z`).toISOString();
}

/**
 * Top countries, devices, operating systems and referrers in one pass over
 * the range's sessions (GROUPING SETS) instead of four separate scans.
 */
export async function getBreakdowns(
  chatbotId: string,
  timeRange: TimeRange,
  limit: number,
  executor: AnalyticsDb = db,
): Promise<Breakdowns> {
  const { start, end } = utcRange(timeRange);
  const s = visitorSessions;

  const result = await executor.execute<BreakdownRow>(sql`
    SELECT
      CASE
        WHEN grouping(${s.countryCode}, ${s.country}) = 0 THEN 'country'
        WHEN grouping(${s.deviceType}) = 0 THEN 'device'
        WHEN grouping(${s.os}) = 0 THEN 'os'
        ELSE 'referrer'
      END AS dimension,
      coalesce(${s.countryCode}, ${s.deviceType}, ${s.os}, ${s.referrer}) AS key,
      ${s.country} AS label,
      count(*) AS count
    FROM ${s}
    WHERE ${s.chatbotId} = ${chatbotId}
      AND ${s.startedAt} BETWEEN ${start} AND ${end}
    GROUP BY GROUPING SETS ((${s.countryCode}, ${s.country}), (${s.deviceType}), (${s.os}), (${s.referrer}))
  `);

  return splitBreakdowns(result.rows, limit);
}

/**
 * Ends a widget session once. The id must belong to the chatbot, the duration
 * is clamped, and an already-ended session is left alone (the widget can end
 * the same session over RPC and again by beacon as the tab closes).
 * Returns whether a session was ended.
 */
export async function endVisitorSession(input: {
  sessionId: string;
  chatbotId: string;
  durationMs?: unknown;
  isBounce?: boolean;
  pageViews?: number;
}): Promise<boolean> {
  const durationMs = clampDurationMs(input.durationMs);

  const ended = await db
    .update(visitorSessions)
    .set({
      endedAt: new Date(),
      isWidgetActive: false,
      ...(durationMs !== undefined && { durationMs }),
      ...(input.isBounce !== undefined && { isBounce: input.isBounce }),
      ...(input.pageViews !== undefined && { pageViews: input.pageViews }),
    })
    .where(
      and(
        eq(visitorSessions.id, input.sessionId),
        eq(visitorSessions.chatbotId, input.chatbotId),
        isNull(visitorSessions.endedAt),
      ),
    )
    .returning({ id: visitorSessions.id });

  if (ended.length === 0) return false;
  analyticsEvents.emit("analytics-update", { chatbotId: input.chatbotId, action: "session-end" });
  return true;
}
