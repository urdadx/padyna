import type { Context } from "hono";
import { getClickUpAuthorizeUrl } from "./client";
import {
  createClickUpOAuthState,
  generateOAuthStateToken,
  getClickUpCallbackUrl,
  verifyActiveChatbotAccess,
  type ClickUpAuthContext,
} from "../utils";

export async function createClickUpConnectUrl(c: Context) {
  const user = c.get("user") as ClickUpAuthContext["user"];
  const session = c.get("session") as ClickUpAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createClickUpOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const callbackUrl = getClickUpCallbackUrl();
  const authorizeUrl = getClickUpAuthorizeUrl(state, callbackUrl);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
