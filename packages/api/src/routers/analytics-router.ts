import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, gte, lte, lt, sql, desc, count, countDistinct, avg } from "drizzle-orm";
import {
  visitorSessions,
  visitorEvents,
  analyticsDaily,
  analyticsWeekly,
  analyticsMonthly,
} from "@padyna/db/schema/index";
import { TRPCError } from "@trpc/server";
import { analyticsEvents } from "../lib/events";

type DeviceInfo = {
  type: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  os: string;
  browser: string;
  model?: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
};

function detectDeviceFromUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  const result: DeviceInfo = {
    type: "unknown",
    os: "unknown",
    browser: "unknown",
    isIOS: false,
    isAndroid: false,
    isMac: false,
    isWindows: false,
    isLinux: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false,
  };

  if (
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|tablet|(puffin(?!.*(IP|AP|WP))))/.test(
      ua,
    )
  ) {
    result.type = "tablet";
  } else if (
    /(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds|archos|skyfire|puffin|blazer|bolt|gobrowser|iris|maemo|semc|teashark|uzard)/.test(
      ua,
    )
  ) {
    result.type = "mobile";
  } else {
    result.type = "desktop";
  }

  if (/iphone|ipad|ipod/.test(ua)) {
    result.os = "iOS";
    result.isIOS = true;
  } else if (/android/.test(ua)) {
    result.os = "Android";
    result.isAndroid = true;
  } else if (/macintosh|mac os x/.test(ua)) {
    result.os = "macOS";
    result.isMac = true;
  } else if (/windows|win32|win64|wow64/.test(ua)) {
    result.os = "Windows";
    result.isWindows = true;
  } else if (/linux/.test(ua) && !result.isAndroid) {
    result.os = "Linux";
    result.isLinux = true;
  }

  if (/edg/.test(ua)) {
    result.browser = "Edge";
    result.isEdge = true;
  } else if (/chrome/.test(ua) && !/chromium|edg/.test(ua)) {
    result.browser = "Chrome";
    result.isChrome = true;
  } else if (/firefox/.test(ua)) {
    result.browser = "Firefox";
    result.isFirefox = true;
  } else if (/safari/.test(ua) && !/chrome|chromium|edg/.test(ua)) {
    result.browser = "Safari";
    result.isSafari = true;
  } else if (/msie|trident/.test(ua)) {
    result.browser = "Internet Explorer";
  } else if (/opera/.test(ua)) {
    result.browser = "Opera";
  }

  if (result.isIOS) {
    const matches =
      ua.match(/iphone\s+os\s+(\d+)_(\d+)/i) || ua.match(/ipad;\s+cpu\s+os\s+(\d+)_(\d+)/i);
    if (matches) {
      const model = ua.includes("ipad") ? "iPad" : "iPhone";
      result.model = `${model} (iOS ${matches[1]}.${matches[2]})`;
    }
  } else if (result.isAndroid) {
    const matches = ua.match(/android\s+(\d+)(\.(\d+))?/i);
    if (matches) {
      result.model = `Android ${matches[1]}${matches[3] ? `.${matches[3]}` : ""}`;
    }
  }

  return result;
}

const timeRangeSchema = z.enum(["24h", "7d", "30d", "90d"]).default("24h");

export const paginatedInput = z.object({
  timeRange: timeRangeSchema,
  limit: z.number().min(1).max(100).default(10),
});

function getActiveChatbot(ctx: { session: { session: { activeChatbot?: string | null } } }) {
  const chatbotId = ctx.session.session.activeChatbot;
  if (!chatbotId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active chatbot" });
  }
  return chatbotId;
}

export function getDateRange(timeRange: z.infer<typeof timeRangeSchema>) {
  const now = new Date();
  const start = new Date(now);

  switch (timeRange) {
    case "24h":
      start.setHours(start.getHours() - 24);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end: now };
}

const n = (val: unknown) => Number(val ?? 0);

const calcPercentChange = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

const calcBounceRate = (bounces: number, total: number) =>
  total > 0 ? Math.round((bounces / total) * 100 * 10) / 10 : 0;

interface TrendRow {
  totalSessions: unknown;
  uniqueVisitors: unknown;
  avgSessionDurationMs: unknown;
  totalChatsStarted: unknown;
  bounceCount: unknown;
}

function buildTrendResult(current: TrendRow | undefined, previous: TrendRow | undefined) {
  const totalSessions = n(current?.totalSessions);
  const totalSessionsPrev = n(previous?.totalSessions);
  const uniqueVisitors = n(current?.uniqueVisitors);
  const uniqueVisitorsPrev = n(previous?.uniqueVisitors);
  const totalChats = n(current?.totalChatsStarted);
  const totalChatsPrev = n(previous?.totalChatsStarted);
  const avgDuration = n(current?.avgSessionDurationMs);
  const avgDurationPrev = n(previous?.avgSessionDurationMs);
  const bounceCount = n(current?.bounceCount);
  const bounceCountPrev = n(previous?.bounceCount);

  const bounceRate = calcBounceRate(bounceCount, totalSessions);
  const bounceRatePrev = calcBounceRate(bounceCountPrev, totalSessionsPrev);

  return {
    totalSessions: {
      value: totalSessions,
      previousValue: totalSessionsPrev,
      change: calcPercentChange(totalSessions, totalSessionsPrev),
      direction: totalSessions >= totalSessionsPrev ? "up" : "down",
      isPositive: totalSessions >= totalSessionsPrev,
    },
    uniqueVisitors: {
      value: uniqueVisitors,
      previousValue: uniqueVisitorsPrev,
      change: calcPercentChange(uniqueVisitors, uniqueVisitorsPrev),
      direction: uniqueVisitors >= uniqueVisitorsPrev ? "up" : "down",
      isPositive: uniqueVisitors >= uniqueVisitorsPrev,
    },
    totalChats: {
      value: totalChats,
      previousValue: totalChatsPrev,
      change: calcPercentChange(totalChats, totalChatsPrev),
      direction: totalChats >= totalChatsPrev ? "up" : "down",
      isPositive: totalChats >= totalChatsPrev,
    },
    bounceRate: {
      value: bounceRate,
      previousValue: bounceRatePrev,
      change: calcPercentChange(bounceRate, bounceRatePrev),
      direction: bounceRate <= bounceRatePrev ? "down" : "up",
      isPositive: bounceRate <= bounceRatePrev,
    },
    avgSessionDuration: {
      value: Math.round(avgDuration / 1000),
      previousValue: Math.round(avgDurationPrev / 1000),
      change: calcPercentChange(avgDuration, avgDurationPrev),
      direction: avgDuration >= avgDurationPrev ? "up" : "down",
      isPositive: avgDuration >= avgDurationPrev,
    },
  };
}

export const analyticsRouter = router({
  getOverview: protectedProcedure
    .input(z.object({ timeRange: timeRangeSchema }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);
      const { start, end } = getDateRange(input.timeRange);

      const [sessionsResult, eventsResult, activeVisitorsResult] = await Promise.all([
        db
          .select({
            totalSessions: count().as("total_sessions"),
            uniqueVisitors: countDistinct(visitorSessions.visitorId).as("unique_visitors"),
            avgDuration: avg(visitorSessions.durationMs).as("avg_duration"),
          })
          .from(visitorSessions)
          .where(
            and(
              eq(visitorSessions.chatbotId, chatbotId),
              gte(visitorSessions.startedAt, start),
              lte(visitorSessions.startedAt, end),
            ),
          ),
        db
          .select({ totalChats: count().as("total_chats") })
          .from(visitorEvents)
          .where(
            and(
              eq(visitorEvents.chatbotId, chatbotId),
              eq(visitorEvents.event, "chat_started"),
              gte(visitorEvents.timestamp, start),
              lte(visitorEvents.timestamp, end),
            ),
          ),
        db
          .select({
            count: sql<number>`count(${visitorSessions.id})::int`.as("active_visitors"),
          })
          .from(visitorSessions)
          .where(
            and(
              eq(visitorSessions.chatbotId, chatbotId),
              eq(visitorSessions.isWidgetActive, true),
            ),
          ),
      ]);

      return {
        totalVisits: n(sessionsResult[0]?.totalSessions),
        uniqueVisitors: n(sessionsResult[0]?.uniqueVisitors),
        totalChats: n(eventsResult[0]?.totalChats),
        averageSessionTime: Math.round(n(sessionsResult[0]?.avgDuration) / 1000),
        activeVisitors: n(activeVisitorsResult[0]?.count),
      };
    }),

  getChartData: protectedProcedure
    .input(z.object({ timeRange: timeRangeSchema }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);
      const { start, end } = getDateRange(input.timeRange);

      const rows = await db
        .select({
          date: sql<string>`DATE(${visitorSessions.startedAt})`.as("date"),
          visitors: count().as("visitors"),
          chats: sql<number>`
            COUNT(CASE WHEN ${visitorEvents.event} = 'chat_started' THEN 1 END)
          `.as("chats"),
        })
        .from(visitorSessions)
        .leftJoin(
          visitorEvents,
          and(
            eq(visitorEvents.sessionId, visitorSessions.id),
            eq(visitorEvents.event, "chat_started"),
          ),
        )
        .where(
          and(
            eq(visitorSessions.chatbotId, chatbotId),
            gte(visitorSessions.startedAt, start),
            lte(visitorSessions.startedAt, end),
          ),
        )
        .groupBy(sql`DATE(${visitorSessions.startedAt})`)
        .orderBy(sql`DATE(${visitorSessions.startedAt})`);

      return rows.map((r) => ({
        date: r.date,
        visitors: n(r.visitors),
        chats: n(r.chats),
      }));
    }),

  getTopCountries: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        countryCode: visitorSessions.countryCode,
        country: visitorSessions.country,
        count: count().as("count"),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      )
      .groupBy(visitorSessions.countryCode, visitorSessions.country)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      countryCode: r.countryCode ?? "unknown",
      country: r.country ?? "Unknown",
      value: n(r.count),
    }));
  }),

  getTopCities: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        city: visitorSessions.city,
        countryCode: visitorSessions.countryCode,
        count: count().as("count"),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      )
      .groupBy(visitorSessions.city, visitorSessions.countryCode)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      city: r.city ?? "Unknown",
      countryCode: r.countryCode ?? "unknown",
      value: n(r.count),
    }));
  }),

  getTopContinents: protectedProcedure
    .input(z.object({ timeRange: timeRangeSchema, limit: z.number().min(1).max(10).default(7) }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);
      const { start, end } = getDateRange(input.timeRange);

      const result = await db
        .select({
          continent: visitorSessions.continent,
          count: count().as("count"),
        })
        .from(visitorSessions)
        .where(
          and(
            eq(visitorSessions.chatbotId, chatbotId),
            gte(visitorSessions.startedAt, start),
            lte(visitorSessions.startedAt, end),
          ),
        )
        .groupBy(visitorSessions.continent)
        .orderBy(desc(count()))
        .limit(input.limit);

      return result.map((r) => ({
        continent: r.continent ?? "Unknown",
        value: n(r.count),
      }));
    }),

  getTopDevices: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        deviceType: visitorSessions.deviceType,
        count: count().as("count"),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      )
      .groupBy(visitorSessions.deviceType)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      deviceType: r.deviceType ?? "unknown",
      count: n(r.count),
    }));
  }),

  getTopOS: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        os: visitorSessions.os,
        count: count().as("count"),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      )
      .groupBy(visitorSessions.os)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      os: r.os ?? "unknown",
      count: n(r.count),
    }));
  }),

  getTopReferrers: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        referrer: visitorSessions.referrer,
        count: count().as("count"),
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.chatbotId, chatbotId),
          gte(visitorSessions.startedAt, start),
          lte(visitorSessions.startedAt, end),
        ),
      )
      .groupBy(visitorSessions.referrer)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      referrer: r.referrer ?? "direct",
      value: n(r.count),
    }));
  }),

  getDaily: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);
      const end = input.endDate ?? new Date();
      const start = input.startDate ?? new Date(end.getTime() - input.limit * 24 * 60 * 60 * 1000);

      return db
        .select()
        .from(analyticsDaily)
        .where(
          and(
            eq(analyticsDaily.chatbotId, chatbotId),
            gte(analyticsDaily.date, start),
            lte(analyticsDaily.date, end),
          ),
        )
        .orderBy(analyticsDaily.date)
        .limit(input.limit);
    }),

  getWeekly: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(52).default(12) }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);

      return db
        .select()
        .from(analyticsWeekly)
        .where(eq(analyticsWeekly.chatbotId, chatbotId))
        .orderBy(desc(analyticsWeekly.weekStart))
        .limit(input.limit);
    }),

  getMonthly: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);

      return db
        .select()
        .from(analyticsMonthly)
        .where(eq(analyticsMonthly.chatbotId, chatbotId))
        .orderBy(desc(analyticsMonthly.year), desc(analyticsMonthly.month))
        .limit(input.limit);
    }),

  getDailyTrend: protectedProcedure.query(async ({ ctx }) => {
    const chatbotId = getActiveChatbot(ctx);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const trendFields = {
      totalSessions: analyticsDaily.totalSessions,
      uniqueVisitors: analyticsDaily.uniqueVisitors,
      avgSessionDurationMs: analyticsDaily.avgSessionDurationMs,
      totalChatsStarted: analyticsDaily.totalChatsStarted,
      bounceCount: analyticsDaily.bounceCount,
    };

    const [todayData, yesterdayData] = await Promise.all([
      db
        .select(trendFields)
        .from(analyticsDaily)
        .where(and(eq(analyticsDaily.chatbotId, chatbotId), eq(analyticsDaily.date, today)))
        .limit(1),
      db
        .select(trendFields)
        .from(analyticsDaily)
        .where(and(eq(analyticsDaily.chatbotId, chatbotId), eq(analyticsDaily.date, yesterday)))
        .limit(1),
    ]);

    return buildTrendResult(todayData[0], yesterdayData[0]);
  }),

  getWeeklyTrend: protectedProcedure.query(async ({ ctx }) => {
    const chatbotId = getActiveChatbot(ctx);

    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    const trendFields = {
      totalSessions: analyticsWeekly.totalSessions,
      uniqueVisitors: analyticsWeekly.uniqueVisitors,
      avgSessionDurationMs: analyticsWeekly.avgSessionDurationMs,
      totalChatsStarted: analyticsWeekly.totalChatsStarted,
      bounceCount: analyticsWeekly.bounceCount,
    };

    const [thisWeek, lastWeek] = await Promise.all([
      db
        .select(trendFields)
        .from(analyticsWeekly)
        .where(
          and(
            eq(analyticsWeekly.chatbotId, chatbotId),
            gte(analyticsWeekly.weekStart, thisWeekStart),
          ),
        )
        .limit(1),
      db
        .select(trendFields)
        .from(analyticsWeekly)
        .where(
          and(
            eq(analyticsWeekly.chatbotId, chatbotId),
            gte(analyticsWeekly.weekStart, lastWeekStart),
            lt(analyticsWeekly.weekStart, thisWeekStart),
          ),
        )
        .limit(1),
    ]);

    return buildTrendResult(thisWeek[0], lastWeek[0]);
  }),

  getMonthlyTrend: protectedProcedure.query(async ({ ctx }) => {
    const chatbotId = getActiveChatbot(ctx);

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
    const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

    const trendFields = {
      totalSessions: analyticsMonthly.totalSessions,
      uniqueVisitors: analyticsMonthly.uniqueVisitors,
      avgSessionDurationMs: analyticsMonthly.avgSessionDurationMs,
      totalChatsStarted: analyticsMonthly.totalChatsStarted,
      bounceCount: analyticsMonthly.bounceCount,
    };

    const [thisMonthData, lastMonthData] = await Promise.all([
      db
        .select(trendFields)
        .from(analyticsMonthly)
        .where(
          and(
            eq(analyticsMonthly.chatbotId, chatbotId),
            eq(analyticsMonthly.month, thisMonth),
            eq(analyticsMonthly.year, thisYear),
          ),
        )
        .limit(1),
      db
        .select(trendFields)
        .from(analyticsMonthly)
        .where(
          and(
            eq(analyticsMonthly.chatbotId, chatbotId),
            eq(analyticsMonthly.month, lastMonth),
            eq(analyticsMonthly.year, lastMonthYear),
          ),
        )
        .limit(1),
    ]);

    return buildTrendResult(thisMonthData[0], lastMonthData[0]);
  }),

  trackEvent: publicProcedure
    .input(
      z.object({
        chatbotId: z.uuid(),
        sessionId: z.uuid(),
        visitorId: z.string(),
        event: z.enum([
          "session_start",
          "session_end",
          "page_view",
          "chat_started",
          "chat_message",
          "widget_open",
          "widget_close",
        ]),
        durationMs: z.number().optional(),
        conversationId: z.uuid().optional(),
        extra: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [event] = await db
        .insert(visitorEvents)
        .values({ ...input, timestamp: new Date() })
        .returning();

      return event;
    }),

  createSession: publicProcedure
    .input(
      z.object({
        chatbotId: z.uuid(),
        visitorId: z.string(),
        userAgent: z.string().optional(),
        platform: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const headers = ctx.request?.headers;
      const userAgent = input.userAgent || headers?.userAgent || "";
      const deviceType = detectDeviceFromUserAgent(userAgent).type;

      const [session] = await db
        .insert(visitorSessions)
        .values({
          ...input,
          userAgent,
          deviceType,
          os: detectDeviceFromUserAgent(userAgent).os,
          city: headers?.city,
          region: headers?.region,
          country: headers?.country,
          countryCode: headers?.countryCode,
          continent: headers?.continent,
          referrer: headers?.referer,
          startedAt: new Date(),
        })
        .returning();

      analyticsEvents.emit("analytics-update", {
        chatbotId: input.chatbotId,
        action: "session-create",
      });

      return session;
    }),

  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.uuid(),
        chatbotId: z.uuid(),
        durationMs: z.number().optional(),
        pageViews: z.number().optional(),
        isBounce: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { sessionId, chatbotId, ...rest } = input;
      const [session] = await db
        .update(visitorSessions)
        .set({ ...rest, endedAt: new Date(), isWidgetActive: false })
        .where(eq(visitorSessions.id, sessionId))
        .returning();

      analyticsEvents.emit("analytics-update", {
        chatbotId,
        action: "session-end",
      });

      return session;
    }),

  setWidgetActive: publicProcedure
    .input(z.object({ sessionId: z.uuid(), chatbotId: z.uuid() }))
    .mutation(async ({ input }) => {
      const [session] = await db
        .update(visitorSessions)
        .set({ isWidgetActive: true })
        .where(eq(visitorSessions.id, input.sessionId))
        .returning();

      analyticsEvents.emit("analytics-update", {
        chatbotId: input.chatbotId,
        action: "widget-open",
      });

      return session;
    }),

  setWidgetInactive: publicProcedure
    .input(z.object({ sessionId: z.uuid(), chatbotId: z.uuid() }))
    .mutation(async ({ input }) => {
      const [session] = await db
        .update(visitorSessions)
        .set({ isWidgetActive: false })
        .where(eq(visitorSessions.id, input.sessionId))
        .returning();

      analyticsEvents.emit("analytics-update", {
        chatbotId: input.chatbotId,
        action: "widget-close",
      });

      return session;
    }),
});
