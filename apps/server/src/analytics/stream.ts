import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { analyticsEvents, type AnalyticsEvent } from "@padyna/api/lib/events";
import { TIME_RANGES, getOverviewStats, type TimeRange } from "@padyna/api/lib/analytics";
import { getLivePresenceCount } from "./live-user-count";
import { createOverviewLoader } from "./overview-loader";

/** Changes arriving within this window are sent as one update. */
const UPDATE_DELAY_MS = 1_000;
/** Streams end after this long; the client reconnects for a fresh one. */
const STREAM_LIFETIME_MS = 120_000;

const overviews = createOverviewLoader(async (chatbotId, timeRange) => {
  const [stats, activeVisitors] = await Promise.all([
    getOverviewStats(chatbotId, timeRange as TimeRange),
    getLivePresenceCount(chatbotId),
  ]);
  return { ...stats, activeVisitors };
});

analyticsEvents.on("analytics-update", ({ chatbotId }: AnalyticsEvent) => {
  overviews.invalidate(chatbotId, TIME_RANGES);
});

function parseTimeRange(value: string | undefined): TimeRange {
  return (TIME_RANGES as readonly string[]).includes(value ?? "") ? (value as TimeRange) : "24h";
}

type Variables = {
  user: any;
  session: any;
};

export const analyticsStreamRoutes = new Hono<{ Variables: Variables }>();

analyticsStreamRoutes.use(authMiddleware);

analyticsStreamRoutes.get("/overview", async (c) => {
  const session = c.get("session");
  const chatbotId: string | undefined = session.activeChatbot;

  if (!chatbotId) {
    return c.json({ error: "No active chatbot" }, 401);
  }

  const timeRange = parseTimeRange(c.req.query("timeRange"));

  return streamSSE(c, async (stream) => {
    let id = 0;
    let closed = false;
    let dirty = false;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;
    let wake: (() => void) | undefined;

    const onUpdate = (event: AnalyticsEvent) => {
      if (event.chatbotId !== chatbotId || closed || updateTimer) return;
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        dirty = true;
        wake?.();
      }, UPDATE_DELAY_MS);
    };

    // Runs once however the stream ends, so the listener and timers never leak.
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(updateTimer);
      clearTimeout(lifetimeTimer);
      analyticsEvents.off("analytics-update", onUpdate);
      wake?.();
    };

    const lifetimeTimer = setTimeout(close, STREAM_LIFETIME_MS);
    analyticsEvents.on("analytics-update", onUpdate);
    // A disconnect can surface as the body being cancelled or the request aborting.
    stream.onAbort(close);
    c.req.raw.signal.addEventListener("abort", close, { once: true });

    const send = async () => {
      const data = await overviews.load(chatbotId, timeRange);
      if (closed) return;
      await stream.writeSSE({ data: JSON.stringify(data), event: "overview", id: String(id++) });
    };

    try {
      await send();

      while (!closed) {
        if (!dirty) {
          await new Promise<void>((resolve) => (wake = resolve));
          wake = undefined;
        }
        if (closed) break;
        dirty = false;
        await send();
      }
    } catch (err) {
      console.error("[analytics/overview] stream error:", err);
      if (!closed) {
        await stream
          .writeSSE({ data: JSON.stringify({ error: "fetch_failed" }), event: "error", id: String(id++) })
          .catch(() => {});
      }
    } finally {
      close();
    }
  });
});
