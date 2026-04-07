import { getPgPool } from "@padyna/db";
import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleDiscordOAuthCallback } from "./auth/callback";
import { createDiscordConnectUrl } from "./auth/connect";
import { discordBot } from "./bot";
import { DiscordApiError, getDiscordGuildChannels } from "./client";
import {
  getActiveDiscordConnectionByChatbot,
  isDiscordBotConfigured,
  type DiscordAuthContext,
  verifyActiveChatbotAccess,
} from "./utils";

type WaitUntilTask = Promise<unknown>;

type Variables = {
  user: any;
  session: any;
};

const securedDiscordRoutes = new Hono<{ Variables: Variables }>();
securedDiscordRoutes.use(authMiddleware);

securedDiscordRoutes.get("/connect", async (c) => {
  return createDiscordConnectUrl(c);
});

securedDiscordRoutes.get("/status", async (c) => {
  const user = c.get("user") as DiscordAuthContext["user"];
  const session = c.get("session") as DiscordAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const connection = await getActiveDiscordConnectionByChatbot(access.chatbotId);

  return c.json({
    connected: Boolean(connection),
    chatbotId: access.chatbotId,
    integration: connection
      ? {
          id: connection.id,
          guildId: connection.guildId,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
        }
      : null,
  });
});

securedDiscordRoutes.get("/channels", async (c) => {
  const user = c.get("user") as DiscordAuthContext["user"];
  const session = c.get("session") as DiscordAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (!isDiscordBotConfigured()) {
    return c.json({ message: "Discord bot is not configured" }, 503);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const connection = await getActiveDiscordConnectionByChatbot(access.chatbotId);
  if (!connection) {
    return c.json(
      { message: "Discord integration is not enabled yet. Please check the integrations page" },
      404,
    );
  }

  try {
    const channels = await getDiscordGuildChannels(connection.guildId);

    return c.json({
      chatbotId: access.chatbotId,
      guildId: connection.guildId,
      channels,
    });
  } catch (error) {
    if (error instanceof DiscordApiError) {
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502,
      );
    }

    return c.json({ message: "Failed to load Discord channels" }, 502);
  }
});

securedDiscordRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as DiscordAuthContext["user"];
  const session = c.get("session") as DiscordAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const existingConnection = await getActiveDiscordConnectionByChatbot(access.chatbotId);

  if (!existingConnection) {
    return c.json({
      disconnected: false,
      chatbotId: access.chatbotId,
    });
  }

  const result = await getPgPool().query<{ id: string }>(
    "delete from discord_connection where id = $1 returning id",
    [existingConnection.id],
  );

  const deleted = result.rows[0] ?? null;

  return c.json({
    disconnected: Boolean(deleted),
    chatbotId: access.chatbotId,
  });
});

export const discordRoutes = new Hono();

discordRoutes.get("/callback", handleDiscordOAuthCallback);
discordRoutes.post("/webhook", async (c) => {
  if (!isDiscordBotConfigured()) {
    return c.json({ message: "Discord bot is not configured" }, 503);
  }

  return discordBot.webhooks.discord(c.req.raw, {
    waitUntil: (task: WaitUntilTask) => {
      task.catch((error: unknown) => {
        console.error("Discord webhook task failed", error);
      });
    },
  });
});
discordRoutes.route("/", securedDiscordRoutes);
