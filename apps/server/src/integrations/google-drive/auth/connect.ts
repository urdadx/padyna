import type { Context } from "hono";
import { getGoogleDriveAuthorizeUrl } from "./client";
import {
  createGoogleDriveOAuthState,
  generateOAuthStateToken,
  getGoogleDriveCallbackUrl,
  verifyActiveChatbotAccess,
  type GoogleDriveAuthContext,
} from "../utils";

export async function createGoogleDriveConnectUrl(c: Context) {
  const user = c.get("user") as GoogleDriveAuthContext["user"];
  const session = c.get("session") as GoogleDriveAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createGoogleDriveOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const callbackUrl = getGoogleDriveCallbackUrl();
  const authorizeUrl = getGoogleDriveAuthorizeUrl(state, callbackUrl);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    redirectUrl: callbackUrl,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
