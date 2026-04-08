import { db } from "@padyna/db";
import { slackConnection } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleSlackOAuthCallback } from "./auth/callback";
import { createSlackConnectUrl } from "./auth/connect";
import { initializeSlackBot, slackAdapter, slackBot } from "./bot";
import { getSlackChannels, joinSlackChannel, SlackApiError } from "./client";
import {
  getActiveSlackConnectionByChatbot,
  isSlackConfigured,
  SLACK_PENDING_CHANNEL_ID,
  type SlackAuthContext,
  verifyActiveChatbotAccess,
} from "./utils";

type WaitUntilTask = Promise<unknown>;

type Variables = {
  user: any;
  session: any;
};

const publicSlackRoutes = new Hono();
const securedSlackRoutes = new Hono<{ Variables: Variables }>();

securedSlackRoutes.use(authMiddleware);

function getSlackErrorStatusCode(statusCode?: number) {
  return statusCode === 400
    ? 400
    : statusCode === 401
      ? 401
      : statusCode === 403
        ? 403
        : statusCode === 404
          ? 404
          : statusCode === 409
            ? 409
            : statusCode === 422
              ? 422
              : statusCode === 429
                ? 429
                : 502;
}

export async function handleSlackWebhook(c: Context) {
  if (!isSlackConfigured()) {
    return c.json({ message: "Slack integration is not configured" }, 503);
  }

  console.info("[slack-integration] webhook received", {
    path: new URL(c.req.url).pathname,
  });

  await initializeSlackBot();

  const handler = slackBot.webhooks.slack;
  if (!handler) {
    return c.json({ message: "Slack webhook handler is not configured" }, 503);
  }

  return handler(c.req.raw, {
    waitUntil: (task: WaitUntilTask) => {
      task.catch((error: unknown) => {
        console.error("Slack webhook task failed", error);
      });
    },
  });
}

async function resolveSlackAccess(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as SlackAuthContext["user"];
  const session = c.get("session") as SlackAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  return { access };
}

securedSlackRoutes.get("/connect", async (c) => {
  try {
    return await createSlackConnectUrl(c);
  } catch (error) {
    if (error instanceof SlackApiError) {
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        { status: getSlackErrorStatusCode(error.statusCode) },
      );
    }

    return c.json({ message: "Failed to start Slack OAuth flow" }, 502);
  }
});

securedSlackRoutes.get("/status", async (c) => {
  const resolved = await resolveSlackAccess(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const connection = await getActiveSlackConnectionByChatbot(resolved.access.chatbotId);
  const isPending = connection?.channelId === SLACK_PENDING_CHANNEL_ID;

  return c.json({
    connected: Boolean(connection && !isPending),
    chatbotId: resolved.access.chatbotId,
    integration: connection
      ? {
          id: connection.id,
          teamId: connection.teamId,
          channelId: isPending ? null : connection.channelId,
          isPending,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
        }
      : null,
  });
});

securedSlackRoutes.get("/channels", async (c) => {
  if (!isSlackConfigured()) {
    return c.json({ message: "Slack integration is not configured" }, 503);
  }

  const resolved = await resolveSlackAccess(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const connection = await getActiveSlackConnectionByChatbot(resolved.access.chatbotId);
  if (!connection) {
    return c.json({ message: "Slack integration is not enabled yet. Please connect Slack first." }, 404);
  }

  try {
    const channels = await getSlackChannels(connection.teamId);

    return c.json({
      chatbotId: resolved.access.chatbotId,
      teamId: connection.teamId,
      channelId: connection.channelId === SLACK_PENDING_CHANNEL_ID ? null : connection.channelId,
      channels,
    });
  } catch (error) {
    if (error instanceof SlackApiError) {
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        { status: getSlackErrorStatusCode(error.statusCode) },
      );
    }

    return c.json({ message: "Failed to load Slack channels" }, 502);
  }
});

securedSlackRoutes.post("/channel", async (c) => {
  if (!isSlackConfigured()) {
    return c.json({ message: "Slack integration is not configured" }, 503);
  }

  const resolved = await resolveSlackAccess(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const body = (await c.req.json()) as { channelId?: unknown };
  const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";

  if (!channelId) {
    return c.json({ message: "channelId is required" }, 400);
  }

  const connection = await getActiveSlackConnectionByChatbot(resolved.access.chatbotId);
  if (!connection) {
    return c.json({ message: "Slack integration is not enabled yet. Please connect Slack first." }, 404);
  }

  const [updated] = await db
    .update(slackConnection)
    .set({
      channelId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(slackConnection.id, connection.id),
        eq(slackConnection.chatbotId, resolved.access.chatbotId),
      ),
    )
    .returning({
      id: slackConnection.id,
    });

  if (!updated) {
    return c.json({ message: "Slack integration could not be updated" }, 404);
  }

  try {
    await joinSlackChannel(connection.teamId, channelId);
  } catch (error) {
    console.error("Failed to join Slack channel", error);
  }

  return c.json({ ok: true, chatbotId: resolved.access.chatbotId, channelId });
});

securedSlackRoutes.delete("/disconnect", async (c) => {
  const resolved = await resolveSlackAccess(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const existingConnection = await getActiveSlackConnectionByChatbot(resolved.access.chatbotId);
  if (!existingConnection) {
    return c.json({
      disconnected: false,
      chatbotId: resolved.access.chatbotId,
    });
  }

  const [deleted] = await db
    .delete(slackConnection)
    .where(eq(slackConnection.id, existingConnection.id))
    .returning({ id: slackConnection.id });

  if (deleted && isSlackConfigured()) {
    try {
      await initializeSlackBot();
      await slackAdapter.deleteInstallation(existingConnection.teamId);
    } catch (error) {
      console.error("Failed to delete Slack installation", error);
    }
  }

  return c.json({
    disconnected: Boolean(deleted),
    chatbotId: resolved.access.chatbotId,
  });
});

export const slackRoutes = new Hono();

publicSlackRoutes.get("/callback", handleSlackOAuthCallback);
publicSlackRoutes.post("/webhook", handleSlackWebhook);

slackRoutes.route("/", publicSlackRoutes);
slackRoutes.route("/", securedSlackRoutes);
