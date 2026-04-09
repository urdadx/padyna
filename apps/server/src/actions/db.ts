import { db } from "@padyna/db";
import { agentAction } from "@padyna/db/schema/index";
import { and, desc, eq } from "drizzle-orm";

export async function listAgentActions(args: { chatbotId: string; organizationId: string }) {
  return db
    .select()
    .from(agentAction)
    .where(
      and(
        eq(agentAction.chatbotId, args.chatbotId),
        eq(agentAction.organizationId, args.organizationId),
      ),
    )
    .orderBy(desc(agentAction.createdAt));
}

export async function listEnabledAgentActions(args: { chatbotId: string; organizationId: string }) {
  return db
    .select()
    .from(agentAction)
    .where(
      and(
        eq(agentAction.chatbotId, args.chatbotId),
        eq(agentAction.organizationId, args.organizationId),
        eq(agentAction.enabled, true),
      ),
    )
    .orderBy(desc(agentAction.createdAt));
}

export async function getAgentActionById(args: {
  actionId: string;
  chatbotId: string;
  organizationId: string;
}) {
  const [action] = await db
    .select()
    .from(agentAction)
    .where(
      and(
        eq(agentAction.id, args.actionId),
        eq(agentAction.chatbotId, args.chatbotId),
        eq(agentAction.organizationId, args.organizationId),
      ),
    )
    .limit(1);

  return action ?? null;
}
