import { Hono } from "hono";

type EndSession = (input: {
  sessionId: string;
  chatbotId: string;
  durationMs?: unknown;
  isBounce?: boolean;
}) => Promise<unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

/**
 * Receives the widget's `navigator.sendBeacon` when its page closes (an RPC
 * can be cut off mid-unload). Mounted at /api/analytics/session-end.
 */
export function createEndSessionRoute(endSession: EndSession) {
  const route = new Hono();

  route.post("/", async (c) => {
    const contentType = c.req.header("content-type") || "";

    let fields: Record<string, unknown>;
    try {
      fields = contentType.includes("application/json")
        ? await c.req.json()
        : await c.req.parseBody();
    } catch {
      return c.json({ error: "invalid body" }, 400);
    }

    const { sessionId, chatbotId, durationMs, isBounce } = fields;
    if (
      typeof sessionId !== "string" ||
      !UUID.test(sessionId) ||
      typeof chatbotId !== "string" ||
      !UUID.test(chatbotId)
    ) {
      return c.json({ error: "missing fields" }, 400);
    }

    await endSession({ sessionId, chatbotId, durationMs, isBounce: parseBoolean(isBounce) });

    return c.json({ ok: true });
  });

  return route;
}
