import { db } from "@padyna/db";
import { env } from "@padyna/env/server";
import { chatbot, clickupIntegration, clickupOAuthState } from "@padyna/db/schema/index";
import { and, eq, gt, isNull } from "drizzle-orm";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type ClickUpAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export function getClickUpCallbackUrl(): string {
  const baseUrl = new URL(env.BETTER_AUTH_URL);
  return new URL("/api/integrations/clickup/callback", baseUrl).toString();
}

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function verifyActiveChatbotAccess(authContext: ClickUpAuthContext) {
  const activeChatbot = authContext.session.activeChatbot;
  const activeOrganization = authContext.session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return null;
  }

  const [record] = await db
    .select({ id: chatbot.id })
    .from(chatbot)
    .where(and(eq(chatbot.id, activeChatbot), eq(chatbot.organizationId, activeOrganization)))
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
  };
}

export async function createClickUpOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(clickupOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeClickUpOAuthState(stateValue: string) {
  const now = new Date();

  const [stateRecord] = await db
    .update(clickupOAuthState)
    .set({ usedAt: now })
    .where(
      and(
        eq(clickupOAuthState.state, stateValue),
        isNull(clickupOAuthState.usedAt),
        gt(clickupOAuthState.expiresAt, now),
      ),
    )
    .returning({
      userId: clickupOAuthState.userId,
      chatbotId: clickupOAuthState.chatbotId,
      expiresAt: clickupOAuthState.expiresAt,
    });

  return stateRecord ?? null;
}

export async function getActiveClickUpIntegrationByChatbot(chatbotId: string) {
  const [integration] = await db
    .select()
    .from(clickupIntegration)
    .where(and(eq(clickupIntegration.chatbotId, chatbotId), eq(clickupIntegration.isActive, true)))
    .limit(1);

  return integration ?? null;
}
