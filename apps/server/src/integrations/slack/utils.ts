import { db, getPgPool } from "@padyna/db";
import { slackOAuthState } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";

type SessionShape = {
  activeOrganization?: string | null;
  activeChatbot?: string | null;
};

type UserShape = {
  id?: string | null;
};

export type SlackAuthContext = {
  user: UserShape;
  session: SessionShape;
};

export const SLACK_PENDING_CHANNEL_ID = "__pending__";

const SLACK_BOT_SCOPES = [
  "app_mentions:read",
  "channels:history",
  "channels:join",
  "channels:read",
  "chat:write",
  "groups:history",
  "groups:read",
  "im:history",
  "im:read",
  "mpim:history",
  "mpim:read",
  "reactions:read",
  "reactions:write",
  "users:read",
];

export function generateOAuthStateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function getSlackRedirectUri() {
  return env.SLACK_REDIRECT_URI ?? null;
}

export function isSlackConfigured() {
  return Boolean(
    env.SLACK_CLIENT_ID &&
      env.SLACK_CLIENT_SECRET &&
      env.SLACK_SIGNING_SECRET &&
      getSlackRedirectUri(),
  );
}

export function getSlackAuthorizeUrl(state: string) {
  const redirectUri = getSlackRedirectUri();

  if (!env.SLACK_CLIENT_ID || !redirectUri) {
    throw new Error("Slack OAuth is not configured");
  }

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", env.SLACK_CLIENT_ID);
  url.searchParams.set("scope", SLACK_BOT_SCOPES.join(","));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function verifyActiveChatbotAccess(authContext: SlackAuthContext) {
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

export async function createSlackOAuthState(args: {
  state: string;
  userId: string;
  chatbotId: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(slackOAuthState).values({
    state: args.state,
    userId: args.userId,
    chatbotId: args.chatbotId,
    expiresAt,
  });

  return expiresAt;
}

export async function consumeSlackOAuthState(stateValue: string) {
  const now = new Date();

  const result = await getPgPool().query<{
    user_id: string;
    chatbot_id: string;
    expires_at: Date;
  }>(
    `
      update slack_oauth_state
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

export async function getActiveSlackConnectionByChatbot(chatbotId: string) {
  const connections = await db.query.slackConnection.findMany();
  const connection = connections.find((item) => item.chatbotId === chatbotId) ?? null;

  return connection ?? null;
}
