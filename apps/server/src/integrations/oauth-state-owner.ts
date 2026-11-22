import { auth } from "@padyna/auth";
import type { Context } from "hono";

/**
 * Whether the person completing an OAuth callback is the one who started the connection. The
 * state alone isn't enough: a connect link can be sent to someone else, whose approval would
 * then attach their account to the sender's chatbot.
 */
export async function isOAuthStateOwner(c: Context, stateUserId: string) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user?.id === stateUserId;
}

export const OAUTH_STATE_OWNER_MESSAGE =
  "Finish connecting in the browser where you're signed in to Padyna, as the person who started the connection.";
