import type { Context } from "hono";
import {
  createDiscordOAuthState,
  generateOAuthStateToken,
  getDiscordAuthorizeUrl,
  isDiscordBotConfigured,
  isDiscordOAuthConfigured,
  type DiscordAuthContext,
  verifyActiveChatbotAccess,
} from "../utils";

export async function createDiscordConnectUrl(c: Context) {
  const user = c.get("user") as DiscordAuthContext["user"];
  const session = c.get("session") as DiscordAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (!isDiscordOAuthConfigured() || !isDiscordBotConfigured()) {
    return c.json({ message: "Discord integration is not configured" }, 503);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createDiscordOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const authorizeUrl = getDiscordAuthorizeUrl(state);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
