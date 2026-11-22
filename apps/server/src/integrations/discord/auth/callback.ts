import { db, getPgPool } from "@padyna/db";
import { discordConnection } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";
import type { Context } from "hono";
import { consumeDiscordOAuthState, getDiscordApplicationId, getDiscordRedirectUri } from "../utils";
import { isOAuthStateOwner, OAUTH_STATE_OWNER_MESSAGE } from "../../oauth-state-owner";

async function exchangeDiscordOAuthCode(code: string) {
  const clientId = getDiscordApplicationId();
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const redirectUri = getDiscordRedirectUri();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Discord OAuth credentials are incomplete");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function renderCloseWindowPage(message: string) {
  const escapedMessage = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Discord Connected</title>
  </head>
  <body>
    <script>
      window.close();
    </script>
    <p>${escapedMessage}</p>
  </body>
</html>`;
}

export async function handleDiscordOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Discord OAuth error", error: oauthError }, 400);
  }

  if (!state || !code) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  // The server the bot was added to comes from Discord's token response. The `guild_id` query
  // parameter is only a hint from the redirect URL, which the person completing the flow can edit.
  let guildId: string | undefined;
  try {
    const token = (await exchangeDiscordOAuthCode(code)) as { guild?: { id?: unknown } };
    guildId = typeof token.guild?.id === "string" ? token.guild.id : undefined;
  } catch (error) {
    console.error("Discord OAuth token exchange failed", error);
    return c.json({ message: "Discord OAuth token exchange failed" }, 502);
  }

  if (!guildId) {
    return c.json({ message: "Discord didn't say which server the bot was added to" }, 400);
  }
  const queryGuildId = c.req.query("guild_id");
  if (queryGuildId && queryGuildId !== guildId) {
    return c.json({ message: "Server mismatch" }, 400);
  }

  const stateRecord = await consumeDiscordOAuthState(state);
  if (!stateRecord) {
    return c.json({ message: "Invalid or expired OAuth state" }, 400);
  }

  if (!(await isOAuthStateOwner(c, stateRecord.userId))) {
    return c.json({ message: OAUTH_STATE_OWNER_MESSAGE }, 403);
  }

  const chatbots = await db.query.chatbot.findMany({
    columns: {
      id: true,
      organizationId: true,
    },
  });

  const chatbotRecord = chatbots.find((item) => item.id === stateRecord.chatbotId) ?? null;

  if (!chatbotRecord) {
    return c.json({ message: "Chatbot not found" }, 404);
  }

  await getPgPool().query(
    "delete from discord_connection where chatbot_id = $1 or guild_id = $2",
    [stateRecord.chatbotId, guildId],
  );

  await db.insert(discordConnection).values({
    guildId,
    chatbotId: stateRecord.chatbotId,
    organizationId: chatbotRecord.organizationId,
  });

  return c.html(renderCloseWindowPage("Discord connected. You can close this window."));
}
