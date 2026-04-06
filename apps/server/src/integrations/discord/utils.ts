import { db, getPgPool } from "@padyna/db";
import { discordOAuthState } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type DiscordAuthContext = {
  user: UserShape;
  session: SessionShape;
};

const DISCORD_BOT_PERMISSIONS = "377957222464";

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function getDiscordApplicationId() {
  return env.DISCORD_CLIENT_ID ?? env.DISCORD_APPLICATION_ID ?? null;
}

export function getDiscordRedirectUri() {
  return env.DISCORD_REDIRECT_URI ?? null;
}

export function getDiscordWebhookUrl() {
  const redirectUri = getDiscordRedirectUri();

  if (!redirectUri) {
    return null;
  }

  const serverOrigin = new URL(redirectUri).origin;
  return new URL("/api/integrations/discord/webhook", serverOrigin).toString();
}

export function isDiscordBotConfigured() {
  return Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_PUBLIC_KEY && env.DISCORD_APPLICATION_ID);
}

export function isDiscordOAuthConfigured() {
  return Boolean(getDiscordApplicationId() && getDiscordRedirectUri());
}

export function getDiscordAuthorizeUrl(state: string) {
  const applicationId = getDiscordApplicationId();
  const redirectUri = getDiscordRedirectUri();

  if (!applicationId || !redirectUri) {
    throw new Error("Discord OAuth is not configured");
  }

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", applicationId);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("integration_type", "0");
  url.searchParams.set("permissions", DISCORD_BOT_PERMISSIONS);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function verifyActiveChatbotAccess(authContext: DiscordAuthContext) {
  const activeChatbot = authContext.session.activeChatbot;
  const activeOrganization = authContext.session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return null;
  }

  const chatbots = await db.query.chatbot.findMany({
    columns: {
      id: true,
      organizationId: true,
    },
  });

  const record =
    chatbots.find(
      (item) => item.id === activeChatbot && item.organizationId === activeOrganization,
    ) ?? null;

  if (!record) {
    return null;
  }

  return {
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
  };
}

export async function createDiscordOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(discordOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeDiscordOAuthState(stateValue: string) {
  const now = new Date();

  const result = await getPgPool().query<{
    user_id: string;
    chatbot_id: string;
    expires_at: Date;
  }>(
    `
      update discord_oauth_state
      set used_at = $1
      where state = $2 and used_at is null and expires_at > $1
      returning user_id, chatbot_id, expires_at
    `,
    [now, stateValue],
  );

  const stateRecord = result.rows[0];
  if (!stateRecord) {
    return null;
  }

  return {
    userId: stateRecord.user_id,
    chatbotId: stateRecord.chatbot_id,
    expiresAt: stateRecord.expires_at,
  };
}

export async function getActiveDiscordConnectionByChatbot(chatbotId: string) {
  const connections = await db.query.discordConnection.findMany();
  const connection = connections.find((item) => item.chatbotId === chatbotId) ?? null;

  return connection ?? null;
}
