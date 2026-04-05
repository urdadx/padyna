import { db } from "@padyna/db";
import { calendlyIntegration, calendlyOAuthState, chatbot } from "@padyna/db/schema/index";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { refreshCalendlyAccessToken } from "./auth/client";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type CalendlyAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export function getCalendlyCallbackUrl(c: Context): string {
  const currentUrl = new URL(c.req.url);
  return `${currentUrl.origin}/api/integrations/calendly/callback`;
}

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function verifyActiveChatbotAccess(authContext: CalendlyAuthContext) {
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

export async function createCalendlyOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(calendlyOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeCalendlyOAuthState(stateValue: string) {
  const now = new Date();

  const [stateRecord] = await db
    .update(calendlyOAuthState)
    .set({ usedAt: now })
    .where(
      and(
        eq(calendlyOAuthState.state, stateValue),
        isNull(calendlyOAuthState.usedAt),
        gt(calendlyOAuthState.expiresAt, now),
      ),
    )
    .returning({
      userId: calendlyOAuthState.userId,
      chatbotId: calendlyOAuthState.chatbotId,
      expiresAt: calendlyOAuthState.expiresAt,
    });

  return stateRecord ?? null;
}

export async function getActiveCalendlyIntegrationByChatbot(chatbotId: string) {
  const [integration] = await db
    .select()
    .from(calendlyIntegration)
    .where(
      and(eq(calendlyIntegration.chatbotId, chatbotId), eq(calendlyIntegration.isActive, true)),
    )
    .limit(1);

  return integration ?? null;
}

export async function getActiveCalendlyIntegrationForChatbotInOrganization(
  chatbotId: string,
  organizationId: string,
) {
  const [row] = await db
    .select({ integration: calendlyIntegration })
    .from(calendlyIntegration)
    .innerJoin(chatbot, eq(chatbot.id, calendlyIntegration.chatbotId))
    .where(
      and(
        eq(calendlyIntegration.chatbotId, chatbotId),
        eq(calendlyIntegration.isActive, true),
        eq(chatbot.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row?.integration ?? null;
}

export async function refreshCalendlyAccessTokenIfNeeded(
  integration: typeof calendlyIntegration.$inferSelect,
) {
  const expiry = integration.accessTokenExpiresAt;
  const needsRefresh = !expiry || expiry.getTime() <= Date.now() + 60 * 1000;

  if (!needsRefresh) {
    return integration;
  }

  if (!integration.refreshToken) {
    return integration;
  }

  const refreshed = await refreshCalendlyAccessToken(integration.refreshToken);
  const accessTokenExpiresAt = new Date((refreshed.created_at + refreshed.expires_in) * 1000);

  const [updated] = await db
    .update(calendlyIntegration)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || integration.refreshToken,
      scope: refreshed.scope ?? integration.scope,
      accessTokenExpiresAt,
      updatedAt: new Date(),
      isActive: true,
      disconnectedAt: null,
    })
    .where(eq(calendlyIntegration.id, integration.id))
    .returning();

  return updated ?? integration;
}
