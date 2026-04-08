import type { Context } from "hono";
import {
  createSlackOAuthState,
  generateOAuthStateToken,
  getSlackAuthorizeUrl,
  isSlackConfigured,
  type SlackAuthContext,
  verifyActiveChatbotAccess,
} from "../utils";

export async function createSlackConnectUrl(c: Context) {
  const user = c.get("user") as SlackAuthContext["user"];
  const session = c.get("session") as SlackAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (!isSlackConfigured()) {
    return c.json({ message: "Slack integration is not configured" }, 503);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createSlackOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const authorizeUrl = getSlackAuthorizeUrl(state);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
