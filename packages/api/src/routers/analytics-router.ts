import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, gte, lte, sql, desc, count, countDistinct, avg } from "drizzle-orm";
import { visitorSessions, visitorEvents, chatbot, chatConversation } from "@padyna/db/schema/index";
import { TRPCError } from "@trpc/server";
import { analyticsEvents } from "../lib/events";
import { createOrganizationNotification } from "@padyna/db/notifications";

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
            and(eq(visitorSessions.chatbotId, chatbotId), eq(visitorSessions.isWidgetActive, true)),
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

  getTopPlatforms: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);
    const { start, end } = getDateRange(input.timeRange);

    const result = await db
      .select({
        platform: chatConversation.channel,
        count: count().as("count"),
      })
      .from(chatConversation)
      .where(
        and(
          eq(chatConversation.chatbotId, chatbotId),
          gte(chatConversation.createdAt, start),
          lte(chatConversation.createdAt, end),
        ),
      )
      .groupBy(chatConversation.channel)
      .orderBy(desc(count()))
      .limit(input.limit);

    return result.map((r) => ({
      platform: r.platform ?? "widget",
      value: n(r.count),
    }));
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

      const [chatbotRecord] = await db
        .select({ organizationId: chatbot.organizationId })
        .from(chatbot)
        .where(eq(chatbot.id, input.chatbotId))
        .limit(1);

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

      if (chatbotRecord) {
        try {
          await createOrganizationNotification({
            organizationId: chatbotRecord.organizationId,
            chatbotId: input.chatbotId,
            eventType: "visitor.new_unique",
            entityType: "visitor",
            entityId: input.visitorId,
            title: headers?.city
              ? `New visitor from ${headers.city}, ${headers?.country ?? "Unknown"}`
              : `New visitor from ${headers?.country ?? "Unknown"}`,
            body: headers?.city
              ? `${headers.city}, ${headers?.country ?? "Unknown"}`
              : headers?.country,
            metadata: {
              visitorId: input.visitorId,
              chatbotId: input.chatbotId,
              country: headers?.country,
              city: headers?.city,
            },
            dedupeKey: `visitor.new_unique:${input.chatbotId}:${input.visitorId}`,
          });
        } catch (error) {
          console.error("Failed to create visitor.new_unique notification", error);
        }
      }

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
