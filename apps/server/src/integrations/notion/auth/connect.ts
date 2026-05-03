import type { Context } from "hono";
import { getNotionAuthorizeUrl } from "./client";
import {
  createNotionOAuthState,
  generateOAuthStateToken,
  getNotionCallbackUrl,
  verifyActiveChatbotAccess,
  type NotionAuthContext,
} from "../utils";

export async function createNotionConnectUrl(c: Context) {
  const user = c.get("user") as NotionAuthContext["user"];
  const session = c.get("session") as NotionAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createNotionOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const callbackUrl = getNotionCallbackUrl();
  const authorizeUrl = getNotionAuthorizeUrl(state, callbackUrl);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    redirectUrl: callbackUrl,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
