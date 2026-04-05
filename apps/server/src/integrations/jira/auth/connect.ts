import type { Context } from "hono";
import { getJiraAuthorizeUrl } from "./client";
import {
  createJiraOAuthState,
  generateOAuthStateToken,
  getJiraCallbackUrl,
  verifyActiveChatbotAccess,
  type JiraAuthContext,
} from "../utils";

export async function createJiraConnectUrl(c: Context) {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createJiraOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const callbackUrl = getJiraCallbackUrl();
  const authorizeUrl = getJiraAuthorizeUrl(state, callbackUrl);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
