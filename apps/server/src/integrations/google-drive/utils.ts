import { db } from "@padyna/db";
import { chatbot, googleDriveIntegration, googleDriveOAuthState } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";
import { and, eq, gt, isNull } from "drizzle-orm";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type GoogleDriveAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export function getGoogleDriveCallbackUrl(): string {
  if (env.GOOGLE_DRIVE_REDIRECT_URI) {
    return env.GOOGLE_DRIVE_REDIRECT_URI;
  }

  const baseUrl = new URL(env.BETTER_AUTH_URL);
  return new URL("/api/integrations/google-drive/callback", baseUrl).toString();
}

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function verifyActiveChatbotAccess(authContext: GoogleDriveAuthContext) {
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

export async function createGoogleDriveOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(googleDriveOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeGoogleDriveOAuthState(stateValue: string) {
  const now = new Date();

  const [stateRecord] = await db
    .update(googleDriveOAuthState)
    .set({ usedAt: now })
    .where(
      and(
        eq(googleDriveOAuthState.state, stateValue),
        isNull(googleDriveOAuthState.usedAt),
        gt(googleDriveOAuthState.expiresAt, now),
      ),
    )
    .returning({
      userId: googleDriveOAuthState.userId,
      chatbotId: googleDriveOAuthState.chatbotId,
      expiresAt: googleDriveOAuthState.expiresAt,
    });

  return stateRecord ?? null;
}

export async function getActiveGoogleDriveIntegrationByChatbot(chatbotId: string) {
  const [integration] = await db
    .select()
    .from(googleDriveIntegration)
    .where(
      and(
        eq(googleDriveIntegration.chatbotId, chatbotId),
        eq(googleDriveIntegration.isActive, true),
      ),
    )
    .limit(1);

  return integration ?? null;
}
