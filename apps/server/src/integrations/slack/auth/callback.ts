import { db, getPgPool } from "@padyna/db";
import { slackConnection } from "@padyna/db/schema/index";
import type { Context } from "hono";
import { initializeSlackBot, slackAdapter } from "../bot";
import { consumeSlackOAuthState, SLACK_PENDING_CHANNEL_ID } from "../utils";
import { isOAuthStateOwner, OAUTH_STATE_OWNER_MESSAGE } from "../../oauth-state-owner";

function renderCloseWindowPage(message: string) {
  const escapedMessage = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Slack Connected</title>
  </head>
  <body>
    <script>
      window.close();
    </script>
    <p>${escapedMessage}</p>
  </body>
</html>`;
}

export async function handleSlackOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Slack OAuth error", error: oauthError }, 400);
  }

  if (!state || !code) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  const stateRecord = await consumeSlackOAuthState(state);
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

  let teamId: string;

  try {
    await initializeSlackBot();
    const result = await slackAdapter.handleOAuthCallback(c.req.raw);
    teamId = result.teamId;
  } catch (error) {
    console.error("Slack OAuth token exchange failed", error);
    return c.json({ message: "Slack OAuth token exchange failed" }, 502);
  }

  await getPgPool().query("delete from slack_connection where chatbot_id = $1 or team_id = $2", [
    stateRecord.chatbotId,
    teamId,
  ]);

  await db.insert(slackConnection).values({
    teamId,
    channelId: SLACK_PENDING_CHANNEL_ID,
    chatbotId: stateRecord.chatbotId,
    organizationId: chatbotRecord.organizationId,
  });

  return c.html(renderCloseWindowPage("Slack connected. Finish channel setup in the dashboard."));
}
