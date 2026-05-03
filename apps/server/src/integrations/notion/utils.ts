import { db } from "@padyna/db";
import { chatbot, notionIntegration, notionOAuthState } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";
import { and, eq, gt, isNull } from "drizzle-orm";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type NotionAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export function getNotionCallbackUrl(): string {
  if (env.NOTION_REDIRECT_URI) {
    return env.NOTION_REDIRECT_URI;
  }

  const baseUrl = new URL(env.BETTER_AUTH_URL);
  return new URL("/api/integrations/notion/callback", baseUrl).toString();
}

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function verifyActiveChatbotAccess(authContext: NotionAuthContext) {
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

export async function createNotionOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(notionOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeNotionOAuthState(stateValue: string) {
  const now = new Date();

  const [stateRecord] = await db
    .update(notionOAuthState)
    .set({ usedAt: now })
    .where(
      and(
        eq(notionOAuthState.state, stateValue),
        isNull(notionOAuthState.usedAt),
        gt(notionOAuthState.expiresAt, now),
      ),
    )
    .returning({
      userId: notionOAuthState.userId,
      chatbotId: notionOAuthState.chatbotId,
      expiresAt: notionOAuthState.expiresAt,
    });

  return stateRecord ?? null;
}

export async function getActiveNotionIntegrationByChatbot(chatbotId: string) {
  const [integration] = await db
    .select()
    .from(notionIntegration)
    .where(and(eq(notionIntegration.chatbotId, chatbotId), eq(notionIntegration.isActive, true)))
    .limit(1);

  return integration ?? null;
}
