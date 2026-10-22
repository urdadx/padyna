import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, gte, lte, ne, sql, desc, count } from "drizzle-orm";
import {
  visitorSessions,
  visitorEvents,
  chatbot,
  chatConversation,
  agentAction,
} from "@padyna/db/schema/index";
import { TRPCError } from "@trpc/server";
import { analyticsEvents } from "../lib/events";
import {
  TIME_RANGES,
  clampDurationMs,
  endVisitorSession,
  getBreakdowns,
  getChartSeries,
  getDateRange,
  getOverviewStats,
} from "../lib/analytics";
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

const timeRangeSchema = z.enum(TIME_RANGES).default("24h");

const paginatedInput = z.object({
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

const n = (val: unknown) => Number(val ?? 0);

/** Sets the widget-open flag; announces it only when it actually changed. */
async function setWidgetOpen(input: { sessionId: string; chatbotId: string }, open: boolean) {
  const updated = await db
    .update(visitorSessions)
    .set({ isWidgetActive: open })
    .where(
      and(
        eq(visitorSessions.id, input.sessionId),
        eq(visitorSessions.chatbotId, input.chatbotId),
        ne(visitorSessions.isWidgetActive, open),
      ),
    )
    .returning({ id: visitorSessions.id });

  if (updated.length > 0) {
    analyticsEvents.emit("analytics-update", {
      chatbotId: input.chatbotId,
      action: open ? "widget-open" : "widget-close",
    });
  }

  return { ok: true };
}

export const analyticsRouter = router({
  getTopActions: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const chatbotId = getActiveChatbot(ctx);

    const actions = await db
      .select({
        id: agentAction.id,
        name: agentAction.name,
        value: agentAction.timesUsed,
      })
      .from(agentAction)
      .where(eq(agentAction.chatbotId, chatbotId))
      .orderBy(desc(agentAction.timesUsed))
      .limit(input.limit);

    return actions.map((a) => ({
      title: a.name,
      value: a.value,
      linkId: a.id,
      href: "",
    }));
  }),

  getOverview: protectedProcedure
    .input(z.object({ timeRange: timeRangeSchema }))
    .query(async ({ ctx, input }) => {
      const chatbotId = getActiveChatbot(ctx);

      const [stats, [active]] = await Promise.all([
        getOverviewStats(chatbotId, input.timeRange),
        db
          .select({ count: count() })
          .from(visitorSessions)
          .where(
            and(eq(visitorSessions.chatbotId, chatbotId), eq(visitorSessions.isWidgetActive, true)),
          ),
      ]);

      return { ...stats, activeVisitors: n(active?.count) };
    }),

  getChartData: protectedProcedure
    .input(z.object({ timeRange: timeRangeSchema }))
    .query(({ ctx, input }) => getChartSeries(getActiveChatbot(ctx), input.timeRange)),

  /** Top countries, devices, operating systems and referrers, in one query. */
  getBreakdowns: protectedProcedure
    .input(paginatedInput)
    .query(({ ctx, input }) => getBreakdowns(getActiveChatbot(ctx), input.timeRange, input.limit)),

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
        visitorId: z.string().max(200),
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
      // Recorded only when the session belongs to the chatbot, so events can't
      // be filed against another chatbot's analytics.
      const inserted = await db
        .insert(visitorEvents)
        .select(
          db
            .select({
              id: sql<string>`gen_random_uuid()`.as("id"),
              sessionId: visitorSessions.id,
              chatbotId: visitorSessions.chatbotId,
              visitorId: sql<string>`${input.visitorId}`.as("visitor_id"),
              event: sql<typeof input.event>`${input.event}`.as("event"),
              conversationId: sql<string | null>`${input.conversationId ?? null}::uuid`.as(
                "conversation_id",
              ),
              durationMs: sql<number | null>`${clampDurationMs(input.durationMs) ?? null}::int`.as(
                "duration_ms",
              ),
              timestamp: sql<Date>`now() at time zone 'utc'`.as("timestamp"),
              extra: sql<unknown>`${input.extra ? JSON.stringify(input.extra) : null}::jsonb`.as(
                "extra",
              ),
              deletedAt: sql<Date | null>`null`.as("deleted_at"),
            })
            .from(visitorSessions)
            .where(
              and(
                eq(visitorSessions.id, input.sessionId),
                eq(visitorSessions.chatbotId, input.chatbotId),
              ),
            ),
        )
        .returning({ id: visitorEvents.id });

      if (inserted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // "Chats started" is on the live overview.
      if (input.event === "chat_started") {
        analyticsEvents.emit("analytics-update", {
          chatbotId: input.chatbotId,
          action: "chat-started",
        });
      }

      return { id: inserted[0]!.id };
    }),

  createSession: publicProcedure
    .input(
      z.object({
        chatbotId: z.uuid(),
        visitorId: z.string().max(200),
        userAgent: z.string().max(1000).optional(),
        platform: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const headers = ctx.request?.headers;
      const userAgent = input.userAgent || headers?.userAgent || "";
      const device = detectDeviceFromUserAgent(userAgent);

      const [chatbotRecord] = await db
        .select({ organizationId: chatbot.organizationId })
        .from(chatbot)
        .where(eq(chatbot.id, input.chatbotId))
        .limit(1);

      if (!chatbotRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chatbot not found" });
      }

      // Sessions start when the widget opens, so they start active.
      const [session] = await db
        .insert(visitorSessions)
        .values({
          ...input,
          userAgent,
          deviceType: device.type,
          os: device.os,
          city: headers?.city,
          region: headers?.region,
          country: headers?.country,
          countryCode: headers?.countryCode,
          continent: headers?.continent,
          referrer: headers?.referer,
          startedAt: new Date(),
          isWidgetActive: true,
        })
        .returning({ id: visitorSessions.id });

      analyticsEvents.emit("analytics-update", {
        chatbotId: input.chatbotId,
        action: "session-create",
      });

      // Deduplicated per visitor; it needn't hold up the widget.
      createOrganizationNotification({
        organizationId: chatbotRecord.organizationId,
        chatbotId: input.chatbotId,
        eventType: "visitor.new_unique",
        entityType: "visitor",
        entityId: input.visitorId,
        title: headers?.city
          ? `New visitor from ${headers.city}, ${headers?.country ?? "Unknown"}`
          : `New visitor from ${headers?.country ?? "Unknown"}`,
        body: headers?.city ? `${headers.city}, ${headers?.country ?? "Unknown"}` : headers?.country,
        metadata: {
          visitorId: input.visitorId,
          chatbotId: input.chatbotId,
          country: headers?.country,
          city: headers?.city,
        },
        dedupeKey: `visitor.new_unique:${input.chatbotId}:${input.visitorId}`,
      }).catch((error) => {
        console.error("Failed to create visitor.new_unique notification", error);
      });

      return session!;
    }),

  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.uuid(),
        chatbotId: z.uuid(),
        durationMs: z.number().optional(),
        pageViews: z.number().int().min(0).max(100_000).optional(),
        isBounce: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => ({ ended: await endVisitorSession(input) })),

  setWidgetActive: publicProcedure
    .input(z.object({ sessionId: z.uuid(), chatbotId: z.uuid() }))
    .mutation(({ input }) => setWidgetOpen(input, true)),

  setWidgetInactive: publicProcedure
    .input(z.object({ sessionId: z.uuid(), chatbotId: z.uuid() }))
    .mutation(({ input }) => setWidgetOpen(input, false)),
});
