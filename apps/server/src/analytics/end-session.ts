import { Hono } from "hono";
import { db } from "@padyna/db";
import { eq } from "drizzle-orm";
import { visitorSessions } from "@padyna/db/schema/index";
import { analyticsEvents } from "@padyna/api/lib/events";

export const endSessionRoute = new Hono();

endSessionRoute.post("/api/analytics/session-end", async (c) => {
  const contentType = c.req.header("content-type") || "";

  let sessionId: string | undefined;
  let chatbotId: string | undefined;
  let durationMs: number | undefined;
  let isBounce: boolean | undefined;

  if (contentType.includes("application/json")) {
    const body = await c.req.json();
    sessionId = body.sessionId;
    chatbotId = body.chatbotId;
    durationMs = body.durationMs;
    isBounce = body.isBounce;
  } else {
    const formData = await c.req.parseBody();
    sessionId = formData.sessionId as string | undefined;
    chatbotId = formData.chatbotId as string | undefined;
    durationMs = formData.durationMs ? Number(formData.durationMs) : undefined;
    isBounce =
      formData.isBounce === "true" ? true : formData.isBounce === "false" ? false : undefined;
  }

  if (!sessionId || !chatbotId) {
    return c.json({ error: "missing fields" }, 400);
  }

  await db
    .update(visitorSessions)
    .set({
      endedAt: new Date(),
      isWidgetActive: false,
      ...(durationMs != null && !isNaN(durationMs) && { durationMs }),
      ...(isBounce != null && { isBounce }),
    })
    .where(eq(visitorSessions.id, sessionId));

  analyticsEvents.emit("analytics-update", { chatbotId, action: "session-end" });

  return c.json({ ok: true });
});
