import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "@padyna/db";
import { eq, and, gte, lte, count, countDistinct, avg, sql } from "drizzle-orm";
import { visitorSessions, visitorEvents } from "@padyna/db/schema/index";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { analyticsEvents } from "@padyna/api/lib/events";

const n = (val: unknown) => Number(val ?? 0);

function getDateRange(timeRange: string) {
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
    default:
      start.setHours(start.getHours() - 24);
  }

  return { start, end: now };
}

async function fetchOverview(chatbotId: string, timeRange: string) {
  const { start, end } = getDateRange(timeRange);

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
}

type Variables = {
  user: any;
  session: any;
};

export const analyticsStreamRoutes = new Hono<{ Variables: Variables }>();

analyticsStreamRoutes.use(authMiddleware);

analyticsStreamRoutes.get("/overview", async (c) => {
  const session = c.get("session");
  const chatbotId = session.activeChatbot;

  if (!chatbotId) {
    return c.json({ error: "No active chatbot" }, 401);
  }

  const timeRange = c.req.query("timeRange") || "24h";
  const abortSignal = c.req.raw.signal;

  return streamSSE(c, async (stream) => {
    let id = 0;

    const sendData = async () => {
      const data = await fetchOverview(chatbotId, timeRange);
      await stream.writeSSE({
        data: JSON.stringify(data),
        event: "overview",
        id: String(id++),
      });
    };

    const waitForChange = () =>
      new Promise<"changed" | "aborted">((resolve) => {
        const onAbort = () => {
          analyticsEvents.off("analytics-update", onUpdate);
          resolve("aborted");
        };

        const onUpdate = (payload: { chatbotId: string }) => {
          if (payload.chatbotId !== chatbotId) return;
          analyticsEvents.off("analytics-update", onUpdate);
          abortSignal.removeEventListener("abort", onAbort);
          resolve("changed");
        };

        abortSignal.addEventListener("abort", onAbort, { once: true });
        analyticsEvents.on("analytics-update", onUpdate);
      });

    try {
      await sendData();

      while (!abortSignal.aborted) {
        const result = await waitForChange();
        if (result === "aborted") break;

        await sendData();
      }
    } catch (err) {
      console.error("[analytics/overview] stream error:", err);
      try {
        await stream.writeSSE({
          data: JSON.stringify({ error: "fetch_failed" }),
          event: "error",
          id: String(id++),
        });
      } catch {
        // Stream already closed, ignore
      }
    }
  });
});
