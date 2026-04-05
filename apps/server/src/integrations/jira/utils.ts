import { db } from "@padyna/db";
import { env } from "@padyna/env/server";
import { chatbot, jiraIntegration, jiraOAuthState } from "@padyna/db/schema/index";
import { and, eq, gt, isNull } from "drizzle-orm";
import { JiraApiError, refreshJiraAccessToken } from "./auth/client";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type JiraAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export function getJiraCallbackUrl(): string {
  const baseUrl = new URL(env.BETTER_AUTH_URL);
  return new URL("/api/integrations/jira/callback", baseUrl).toString();
}

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function verifyActiveChatbotAccess(authContext: JiraAuthContext) {
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

export async function createJiraOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(jiraOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeJiraOAuthState(stateValue: string) {
  const now = new Date();

  const [stateRecord] = await db
    .update(jiraOAuthState)
    .set({ usedAt: now })
    .where(
      and(
        eq(jiraOAuthState.state, stateValue),
        isNull(jiraOAuthState.usedAt),
        gt(jiraOAuthState.expiresAt, now),
      ),
    )
    .returning({
      userId: jiraOAuthState.userId,
      chatbotId: jiraOAuthState.chatbotId,
      expiresAt: jiraOAuthState.expiresAt,
    });

  return stateRecord ?? null;
}

export async function getActiveJiraIntegrationByChatbot(chatbotId: string) {
  const [integration] = await db
    .select()
    .from(jiraIntegration)
    .where(and(eq(jiraIntegration.chatbotId, chatbotId), eq(jiraIntegration.isActive, true)))
    .limit(1);

  return integration ?? null;
}

export function isJiraAccessTokenExpired(integration: typeof jiraIntegration.$inferSelect) {
  if (!integration.accessTokenExpiresAt) {
    return false;
  }

  return integration.accessTokenExpiresAt.getTime() <= Date.now() + 60 * 1000;
}

export async function refreshJiraAccessTokenIfNeeded(
  integration: typeof jiraIntegration.$inferSelect,
) {
  if (!isJiraAccessTokenExpired(integration)) {
    return integration;
  }

  if (!integration.refreshToken) {
    return integration;
  }

  const refreshed = await refreshJiraAccessToken(integration.refreshToken);
  const accessTokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  const [updated] = await db
    .update(jiraIntegration)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || integration.refreshToken,
      scope: refreshed.scope ?? integration.scope,
      accessTokenExpiresAt,
      updatedAt: new Date(),
      isActive: true,
      disconnectedAt: null,
    })
    .where(eq(jiraIntegration.id, integration.id))
    .returning();

  if (!updated) {
    throw new JiraApiError("Failed to persist refreshed Jira access token", 500);
  }

  return updated;
}
