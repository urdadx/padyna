import { describe, expect, mock, test } from "bun:test";

// Auth, the database and presence are stubbed; the stream logic is real.
let fetches = 0;
mock.module("@/middlewares/auth-middleware", () => ({
  authMiddleware: async (c: any, next: () => Promise<void>) => {
    c.set("session", { activeChatbot: "bot-1" });
    await next();
  },
}));
mock.module("@padyna/api/lib/analytics", () => ({
  TIME_RANGES: ["24h", "7d", "30d", "90d"],
  getOverviewStats: async () => {
    fetches++;
    return { totalVisits: fetches, uniqueVisitors: 0, totalChats: 0, averageSessionTime: 0, bounceRate: 0 };
  },
}));
mock.module("../live-user-count", () => ({ getLivePresenceCount: async () => 3 }));

const { analyticsEvents } = await import("@padyna/api/lib/events");
const { analyticsStreamRoutes } = await import("../stream");

/** Reads SSE "overview" events from a response as they arrive. */
function readOverviews(response: Response) {
  const events: any[] = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const done = (async () => {
    for (;;) {
      const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        const data = block.split("\n").find((line) => line.startsWith("data: "));
        if (block.includes("event: overview") && data) events.push(JSON.parse(data.slice(6)));
      }
    }
  })();
  return { events, done };
}

describe("analytics overview stream", () => {
  test("a burst of changes becomes one update, and closing removes the listener", async () => {
    const listenersBefore = analyticsEvents.listenerCount("analytics-update");
    const controller = new AbortController();
    const response = await analyticsStreamRoutes.request("/overview?timeRange=7d", { signal: controller.signal });
    const { events } = readOverviews(response);

    await Bun.sleep(50);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ totalVisits: 1, activeVisitors: 3 });

    for (let i = 0; i < 20; i++) {
      analyticsEvents.emit("analytics-update", { chatbotId: "bot-1", action: "session-create" });
    }
    // Another chatbot's changes don't wake this stream.
    analyticsEvents.emit("analytics-update", { chatbotId: "bot-2", action: "session-create" });

    await Bun.sleep(1_300);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ totalVisits: 2 });
    expect(fetches).toBe(2);

    controller.abort();
    await Bun.sleep(50);
    // The stream's listener is gone; only the module's cache listener remains.
    expect(analyticsEvents.listenerCount("analytics-update")).toBe(listenersBefore);
  });

  test("a client that stops reading also releases the stream", async () => {
    const listenersBefore = analyticsEvents.listenerCount("analytics-update");
    const response = await analyticsStreamRoutes.request("/overview?timeRange=24h");
    const reader = response.body!.getReader();
    await reader.read();
    expect(analyticsEvents.listenerCount("analytics-update")).toBe(listenersBefore + 1);

    await reader.cancel();
    await Bun.sleep(50);

    expect(analyticsEvents.listenerCount("analytics-update")).toBe(listenersBefore);
  });
});
