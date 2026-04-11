import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@padyna/api/context";
import { appRouter } from "@padyna/api/routers/index";
import { auth } from "@padyna/auth";
import { env } from "@padyna/env/server";
import { db } from "@padyna/db";
import * as schema from "@padyna/db/schema/index";
import { eq, and, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ingestionRoutes } from "./ingestion-routes";
import { chatRoutes, liveChatRoutes } from "./chat";
import { widgetRoutes } from "./widget";
import { analyticsStreamRoutes } from "./analytics/stream";
import { endSessionRoute } from "./analytics/end-session";
import { presenceRoutes } from "./analytics/live-user-count-routes";
import { polarWebhook } from "./payments/webhook";
import { checkout } from "./payments/checkout";
import { websocket } from "hono/bun";
import { broadcastConversationStatusUpdate } from "./chat/live-chat-service";
import { calendlyRoutes } from "./integrations/calendly";
import { calRoutes } from "./integrations/cal/routes";
import { clickupRoutes } from "./integrations/clickup";
import { discordRoutes, registerDiscordGatewayCron } from "./integrations/discord";
import { jiraRoutes } from "./integrations/jira";
import { handleSlackWebhook, slackRoutes } from "./integrations/slack";
import { telegramRoutes } from "./integrations/telegram";
import { actionRoutes } from "./actions";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/accept-invitation/:invitationId", async (c) => {
  const invitationId = c.req.param("invitationId");
  const cookieHeader = c.req.header("Cookie") || "";

  try {
    const response = await auth.api.getInvitation({
      headers: { cookie: cookieHeader },
      query: { id: invitationId },
    });

    if (!response) {
      return c.redirect(`${env.CORS_ORIGIN}/invitation/invalid`);
    }

    const invitation = response;

    if (invitation.status !== "pending") {
      if (invitation.status === "accepted") {
        return c.redirect(`${env.CORS_ORIGIN}/invitation/already-accepted`);
      }
      return c.redirect(`${env.CORS_ORIGIN}/invitation/expired`);
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return c.redirect(`${env.CORS_ORIGIN}/invitation/expired`);
    }

    const sessionCookie = cookieHeader.includes("better-auth.session_token");

    if (sessionCookie) {
      await auth.api.acceptInvitation({
        headers: { cookie: cookieHeader },
        body: { invitationId },
      });
      return c.redirect(`${env.CORS_ORIGIN}/playground?invitation=accepted`);
    }

    return c.redirect(`${env.CORS_ORIGIN}/register?invitationId=${invitationId}`);
  } catch (error: any) {
    console.error("Error processing invitation:", error);

    if (error.status === "UNAUTHORIZED" || error.statusCode === 401) {
      return c.redirect(`${env.CORS_ORIGIN}/register?invitationId=${invitationId}`);
    }

    return c.redirect(`${env.CORS_ORIGIN}/invitation/error`);
  }
});

app.post("/api/accept-invitation/:invitationId", async (c) => {
  const invitationId = c.req.param("invitationId");
  const cookieHeader = c.req.header("Cookie") || "";

  try {
    const invitation = await auth.api.getInvitation({
      headers: { cookie: cookieHeader },
      query: { id: invitationId },
    });

    if (!invitation) {
      return c.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }

    const [organizationChatbot] = await db
      .select()
      .from(schema.chatbot)
      .where(eq(schema.chatbot.organizationId, invitation.organizationId))
      .limit(1);

    const organizationId = invitation.organizationId;
    const chatbotId = organizationChatbot?.id || null;

    await auth.api.acceptInvitation({
      headers: { cookie: cookieHeader },
      body: { invitationId },
    });

    const orgSubscription = await db
      .select()
      .from(schema.subscription)
      .where(
        and(
          eq(schema.subscription.organizationId, organizationId),
          inArray(schema.subscription.status, ["active", "trialing"]),
        ),
      )
      .limit(1);

    if (orgSubscription.length > 0) {
      const session = await auth.api.getSession({
        headers: { cookie: cookieHeader },
      });

      if (session?.user) {
        await db
          .update(schema.user)
          .set({ isSubscribed: true, emailVerified: true, role: "member" })
          .where(eq(schema.user.id, session.user.id));
      }
      if (session?.session) {
        await db
          .update(schema.session)
          .set({
            activeOrganization: organizationId,
            activeChatbot: chatbotId,
            updatedAt: new Date(),
          })
          .where(eq(schema.session.userId, session.user.id));
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    const errorCode = error.body?.code || error.code || null;
    const statusCode = error.statusCode || error.status === "FORBIDDEN" ? 403 : 400;
    return c.json(
      {
        success: false,
        error: error.body?.message || error.message || "Failed to accept invitation",
        code: errorCode,
      },
      { status: statusCode },
    );
  }
});

app.route("/api/ingestion", ingestionRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/live-chat", liveChatRoutes);
app.route("/api/widget", widgetRoutes);
app.route("/api/analytics/stream", analyticsStreamRoutes);
app.route("/api/analytics/session-end", endSessionRoute);
app.route("/api/analytics/presence", presenceRoutes);
app.route("/api/", polarWebhook);
app.route("/api/", checkout);
app.route("/api/integrations/calendly", calendlyRoutes);
app.route("/api/cal", calRoutes);
app.route("/api/integrations/clickup", clickupRoutes);
app.route("/api/integrations/discord", discordRoutes);
app.route("/api/integrations/jira", jiraRoutes);
app.route("/api/integrations/slack", slackRoutes);
app.route("/api/actions", actionRoutes);
app.post("/api/integrations/webhooks/slack", handleSlackWebhook);
app.post("/api/webhooks/slack", handleSlackWebhook);
app.route("/api/integrations/telegram", telegramRoutes);

registerDiscordGatewayCron();

app.use("/api/trpc/*", async (c, next) => {
  const accept = c.req.header("trpc-accept");
  if (accept === "subscription") {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext: () =>
        createContext({
          context: c,
          liveChat: {
            broadcastConversationStatus: broadcastConversationStatusUpdate,
          },
        }),
    });
    if (!response.body) {
      return c.text("No response body", { status: 500 });
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
  return next();
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({
        context,
        liveChat: {
          broadcastConversationStatus: broadcastConversationStatusUpdate,
        },
      });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export default {
  fetch: app.fetch,
  websocket,
};
