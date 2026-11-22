import { db } from "@padyna/db";
import { agentAction, chatbot } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import { createRateLimitMiddleware, getClientIp } from "./ratelimiter";

/**
 * Public form endpoints that act on a tenant's integration (create a Jira issue, a ClickUp task)
 * are reachable by anyone who has seen the action id in a widget conversation. Limit how often
 * one visitor can use one action.
 */
export const publicActionRateLimit = createRateLimitMiddleware({
  namespace: "public-action-submit",
  maxRequests: 5,
  windowSeconds: 10 * 60,
  resolveIdentifier: async (c) => {
    let actionId = "unknown";
    try {
      const body = (await c.req.raw.clone().json()) as { actionId?: unknown };
      if (typeof body.actionId === "string") actionId = body.actionId;
    } catch {
      // The route rejects bodies that aren't JSON.
    }
    return `${actionId}:${getClientIp(c)}`;
  },
});

/** The action, only if it and its chatbot are both enabled. */
export async function findEnabledPublicAction(
  actionId: string,
  provider: (typeof agentAction.$inferSelect)["provider"],
) {
  const [row] = await db
    .select({ action: agentAction })
    .from(agentAction)
    .innerJoin(chatbot, eq(chatbot.id, agentAction.chatbotId))
    .where(
      and(
        eq(agentAction.id, actionId),
        eq(agentAction.provider, provider),
        eq(agentAction.enabled, true),
        eq(chatbot.isEnabled, true),
      ),
    )
    .limit(1);
  return row?.action ?? null;
}
