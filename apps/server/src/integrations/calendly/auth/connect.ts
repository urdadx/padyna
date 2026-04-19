import type { Context } from "hono";
import { getCalendlyAuthorizeUrl } from "./client";
import {
  createCalendlyOAuthState,
  generateOAuthStateToken,
  getCalendlyCallbackUrl,
  verifyActiveChatbotAccess,
  type CalendlyAuthContext,
} from "../utils";

export async function createCalendlyConnectUrl(c: Context) {
  const user = c.get("user") as CalendlyAuthContext["user"];
  const session = c.get("session") as CalendlyAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const state = generateOAuthStateToken();
  const expiresAt = await createCalendlyOAuthState({
    state,
    userId: user.id,
    chatbotId: access.chatbotId,
  });

  const callbackUrl = getCalendlyCallbackUrl();
  const authorizeUrl = getCalendlyAuthorizeUrl(state, callbackUrl);

  return c.json({
    authorizeUrl,
    chatbotId: access.chatbotId,
    stateExpiresAt: expiresAt.toISOString(),
  });
}
