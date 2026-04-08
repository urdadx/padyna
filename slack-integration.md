# Slack Integration

## Overview

This document specifies the Slack integration — from OAuth workspace install, through channel selection, to wiring the Chat SDK with the existing AI agent. The model mirrors Discord: one Slack app serves all organizations, with per-workspace routing to the correct chatbot. After OAuth, the business picks a specific channel to install the bot into. The bot only responds in that channel.

---

## Stack

- **Backend**: Hono on Bun
- **Frontend**: React with TanStack Router
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Chat SDK**: `chat`, `@chat-adapter/slack`, `@chat-adapter/state-pg`
- **AI Agent**: `createSupportChatAgent` (existing)

---

## Architecture

```
Business clicks "Connect Slack" on dashboard
        ↓
Slack OAuth install flow → captures teamId + installs bot token into SDK state
        ↓
Redirect to channel picker page on dashboard
        ↓
Business selects a channel from dropdown (fetched from Slack API)
        ↓
teamId + channelId + chatbotId + organizationId saved to slack_connection table
        ↓
Customer posts a message in that channel
        ↓
Slack sends webhook → bot checks message.channel === connection.channelId
        ↓
Creates/resumes chat_conversation record (channel: "slack")
        ↓
Saves user message to chat_message
        ↓
Runs createSupportChatAgent with chatbot config
        ↓
Saves assistant message to chat_message
        ↓
Posts response in Slack thread
```

---

## 1. Database Schema

### 1.1 New Table: `slack_connection`

```typescript
// packages/db/src/schema/slack-connection.ts
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const slackConnection = pgTable(
  "slack_connection",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    teamId: text("team_id").notNull(), // Slack workspace ID
    channelId: text("channel_id").notNull(), // channel the bot is installed into
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("slack_connection_team_id_uidx").on(table.teamId),
    index("slack_connection_chatbot_id_idx").on(table.chatbotId),
    index("slack_connection_organization_id_idx").on(table.organizationId),
  ],
);
```

**Important:** The bot token for each workspace is **not** stored here. It is managed entirely by the SDK state adapter (stored in `chat_state_*` tables, keyed by `teamId`). Your table only stores the routing mapping.

### 1.2 Existing Tables Used

No changes needed:

- `chat_conversation` — one record per Slack thread, `channel: "slack"`, `metadata` stores `teamId`, `channelId`, `threadTs`
- `chat_message` — one record per message (user and assistant roles)

### 1.3 SDK-managed Tables

Auto-created on `bot.initialize()`:

- `chat_state_subscriptions`
- `chat_state_locks`
- `chat_state_cache`

---

## 2. Environment Variables

```bash
# Backend (.env)
SLACK_CLIENT_ID=                 # Basic Information → App Credentials → Client ID
SLACK_CLIENT_SECRET=             # Basic Information → App Credentials → Client Secret
SLACK_SIGNING_SECRET=            # Basic Information → App Credentials → Signing Secret
SLACK_ENCRYPTION_KEY=            # base64 32-byte key — encrypts bot tokens at rest
SLACK_REDIRECT_URI=              # http://localhost:3000/api/integrations/slack/callback (dev)
                                 # https://yourdomain.com/api/integrations/slack/callback (prod)

# Already set in your app
DATABASE_URL=
APP_URL=                         # http://localhost:3000 (frontend)
API_URL=                         # http://localhost:3000 (backend/Hono)
```

Generate the encryption key:

```bash
openssl rand -base64 32
```

---

## 3. Bot Instance

```typescript
// apps/api/src/lib/slack-bot.ts
import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createPostgresState } from "@chat-adapter/state-pg";

export const slackAdapter = createSlackAdapter({
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  // signingSecret auto-detected from SLACK_SIGNING_SECRET
  // encryptionKey auto-detected from SLACK_ENCRYPTION_KEY
});

export const slackBot = new Chat({
  userName: "yourbot",
  adapters: { slack: slackAdapter },
  state: createPostgresState(),
  // auto-detects DATABASE_URL
});

// register event handlers (imported for side effects)
import "@/lib/slack-handlers";
```

---

## 4. OAuth Install Flow

### 4.1 Invite URL Utility

```typescript
// apps/api/src/lib/slack-oauth.ts
export function getSlackInstallUrl({
  chatbotId,
  organizationId,
}: {
  chatbotId: string;
  organizationId: string;
}): string {
  // encode chatbotId + organizationId in state param
  const state = Buffer.from(JSON.stringify({ chatbotId, organizationId })).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: [
      "app_mentions:read",
      "channels:history",
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
    ].join(","),
    redirect_uri: process.env.SLACK_REDIRECT_URI!,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}
```

### 4.2 Hono Route — Get Install URL

```typescript
// apps/api/src/routes/slack.ts
import { Hono } from "hono";
import { getSlackInstallUrl } from "@/lib/slack-oauth";
import { db } from "@/lib/db";
import { slackConnection } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { slackAdapter, slackBot } from "@/lib/slack-bot";

const slack = new Hono();

// GET /api/slack/invite-url?chatbotId=xxx
slack.get("/invite-url", async (c) => {
  const chatbotId = c.req.query("chatbotId");
  const organizationId = c.get("organizationId"); // from auth middleware

  if (!chatbotId) {
    return c.json({ error: "chatbotId is required" }, 400);
  }

  const url = getSlackInstallUrl({ chatbotId, organizationId });
  return c.json({ url });
});
```

### 4.3 Hono Route — OAuth Callback

Slack redirects here after the business installs the app. The adapter handles the full token exchange. We then redirect to the channel picker.

```typescript
// apps/api/src/routes/slack.ts (continued)

// GET /api/slack/callback
slack.get("/callback", async (c) => {
  const stateParam = c.req.query("state");
  const error = c.req.query("error");
  const appUrl = process.env.APP_URL!;

  if (error || !stateParam) {
    return c.redirect(`${appUrl}/dashboard?slack=cancelled`);
  }

  let chatbotId: string;
  let organizationId: string;

  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    chatbotId = decoded.chatbotId;
    organizationId = decoded.organizationId;
  } catch {
    return c.redirect(`${appUrl}/dashboard?slack=error`);
  }

  let teamId: string;

  try {
    // adapter handles token exchange + stores bot token in SDK state automatically
    await slackBot.initialize();
    const result = await slackAdapter.handleOAuthCallback(c.req.raw);
    teamId = result.teamId;
  } catch {
    return c.redirect(`${appUrl}/dashboard?slack=error`);
  }

  // store routing mapping — no token here, that's in SDK state
  await db
    .insert(slackConnection)
    .values({
      teamId,
      channelId: "__pending__", // placeholder until channel is picked
      chatbotId,
      organizationId,
    })
    .onConflictDoUpdate({
      target: slackConnection.teamId,
      set: { chatbotId, organizationId, updatedAt: new Date() },
    });

  // redirect to channel picker — pass teamId + chatbotId as search params
  return c.redirect(
    `${appUrl}/dashboard/chatbots/${chatbotId}/integrations/slack/setup?teamId=${teamId}`,
  );
});
```

### 4.4 Hono Route — Fetch Channels

The channel picker page calls this to populate the dropdown.

```typescript
// apps/api/src/routes/slack.ts (continued)

// GET /api/slack/channels?teamId=xxx
slack.get("/channels", async (c) => {
  const teamId = c.req.query("teamId");
  const organizationId = c.get("organizationId");

  if (!teamId) {
    return c.json({ error: "teamId is required" }, 400);
  }

  const installation = await slackAdapter.getInstallation(teamId);
  if (!installation) {
    return c.json({ error: "Workspace not installed" }, 404);
  }

  let channels: { id: string; name: string }[] = [];

  await slackAdapter.withBotToken(installation.botToken, async () => {
    const res = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
      {
        headers: {
          Authorization: `Bearer ${installation.botToken}`,
        },
      },
    );
    const data = (await res.json()) as any;
    channels = (data.channels ?? []).map((ch: any) => ({
      id: ch.id,
      name: ch.name,
    }));
  });

  return c.json({ channels });
});
```

### 4.5 Hono Route — Save Selected Channel

```typescript
// apps/api/src/routes/slack.ts (continued)

// POST /api/slack/channel
slack.post("/channel", async (c) => {
  const { teamId, channelId } = await c.req.json();
  const organizationId = c.get("organizationId");

  if (!teamId || !channelId) {
    return c.json({ error: "teamId and channelId are required" }, 400);
  }

  await db
    .update(slackConnection)
    .set({ channelId, updatedAt: new Date() })
    .where(eq(slackConnection.teamId, teamId));

  // invite the bot into the channel so it can post
  const installation = await slackAdapter.getInstallation(teamId);
  if (installation) {
    await fetch("https://slack.com/api/conversations.join", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${installation.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channelId }),
    });
  }

  return c.json({ ok: true });
});

export default slack;
```

### 4.6 Register Routes

```typescript
// apps/api/src/index.ts
import slack from "@/routes/slack";

app.route("/api/slack", slack);
```

---

## 5. Webhook Route

```typescript
// apps/api/src/routes/webhooks.ts (add alongside Discord + Telegram)
import { slackBot } from "@/lib/slack-bot";

// POST /api/webhooks/slack
webhooks.post("/slack", async (c) => {
  const handler = slackBot.webhooks["slack"];

  if (!handler) {
    return c.json({ error: "Slack adapter not configured" }, 404);
  }

  const response = await handler(c.req.raw, {
    waitUntil: (task) => {
      task.catch(console.error);
    },
  });

  return response;
});
```

Set **Event Subscriptions Request URL** and **Interactivity Request URL** in your Slack app settings to:

```
https://yourdomain.com/api/webhooks/slack
```

---

## 6. Bot Event Handlers

The bot is workspace-wide by default, so every handler must check that the incoming message is in the configured channel before doing anything.

```typescript
// apps/api/src/lib/slack-handlers.ts
import { slackBot } from "./slack-bot";
import { db } from "./db";
import { slackConnection } from "@repo/db/schema/slack-connection";
import { chatConversation, chatMessage } from "@repo/db/schema/chat";
import { createSupportChatAgent } from "@/agents/support-chat-agent";
import { eq, and, sql } from "drizzle-orm";

// ─── New Mention ──────────────────────────────────────────────────────────────

slackBot.onNewMention(async (thread, message) => {
  const teamId = message.raw.team;
  const incomingChannelId = message.raw.channel;

  // 1. look up connection for this workspace
  const connection = await db.query.slackConnection.findFirst({
    where: eq(slackConnection.teamId, teamId),
  });

  // 2. ignore if no connection or wrong channel
  if (!connection || connection.channelId === "__pending__") return;
  if (incomingChannelId !== connection.channelId) return;

  // 3. create conversation record
  const [conversation] = await db
    .insert(chatConversation)
    .values({
      chatbotId: connection.chatbotId,
      organizationId: connection.organizationId,
      channel: "slack",
      metadata: {
        teamId,
        channelId: incomingChannelId,
        threadTs: message.raw.thread_ts ?? message.raw.ts,
        slackUserId: message.raw.user,
      },
    })
    .returning();

  // 4. subscribe to thread for follow-ups
  await thread.subscribe();

  // 5. save user message
  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    role: "user",
    messageId: message.id,
    contentText: message.text,
  });

  // 6. run agent and respond
  await runAgentAndRespond({ thread, message, connection, conversationId: conversation.id });
});

// ─── Subscribed Message ───────────────────────────────────────────────────────

slackBot.onSubscribedMessage(async (thread, message) => {
  const teamId = message.raw.team;
  const incomingChannelId = message.raw.channel;
  const threadTs = message.raw.thread_ts ?? message.raw.ts;

  const connection = await db.query.slackConnection.findFirst({
    where: eq(slackConnection.teamId, teamId),
  });

  if (!connection || connection.channelId === "__pending__") return;
  if (incomingChannelId !== connection.channelId) return;

  // find existing conversation by threadTs
  const conversation = await db.query.chatConversation.findFirst({
    where: and(
      eq(chatConversation.channel, "slack"),
      eq(chatConversation.chatbotId, connection.chatbotId),
      sql`metadata->>'threadTs' = ${threadTs}`,
    ),
  });

  if (!conversation) return;

  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    role: "user",
    messageId: message.id,
    contentText: message.text,
  });

  await runAgentAndRespond({ thread, message, connection, conversationId: conversation.id });
});

// ─── Shared Agent Runner ──────────────────────────────────────────────────────

async function runAgentAndRespond({
  thread,
  message,
  connection,
  conversationId,
}: {
  thread: any;
  message: any;
  connection: { chatbotId: string; organizationId: string };
  conversationId: string;
}) {
  await thread.startTyping();

  const agent = createSupportChatAgent({
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    conversationId,
    userId: message.raw.user,
  });

  const response = await agent.run(message.text);
  const responseText = response.text ?? "Sorry, I couldn't generate a response.";

  await db.insert(chatMessage).values({
    conversationId,
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    role: "assistant",
    messageId: crypto.randomUUID(),
    contentText: responseText,
  });

  await thread.post(responseText);
}
```

---

## 9. Local Development

1. Start your Bun dev server:

   ```bash
   bun run dev
   ```

2. Start an ngrok tunnel:

   ```bash
   ngrok http 3000
   ```

3. In your Slack app settings, set both URLs to your ngrok URL:
   - Event Subscriptions Request URL: `https://your-ngrok-url.ngrok.io/api/webhooks/slack`
   - Interactivity Request URL: `https://your-ngrok-url.ngrok.io/api/webhooks/slack`

4. Add redirect URI in Slack app → OAuth & Permissions:

   ```
   http://localhost:3000/api/slack/callback
   ```

5. Open the install URL from `GET /api/slack/invite-url` and install to a test workspace.

6. Complete the channel picker — select a test channel.

7. Post a message in that channel mentioning the bot — it should respond.

---

## 13. Key Constraints & Notes

- **Bot token lives in SDK state, not your DB**: `slackAdapter.handleOAuthCallback` stores the token automatically. Never store it yourself. Use `slackAdapter.getInstallation(teamId)` + `withBotToken` whenever you need it outside webhook context.
- **Channel filter is mandatory**: The bot receives events from the entire workspace. The `incomingChannelId !== connection.channelId` check in handlers is what scopes it to the selected channel.
- **`__pending__` guard**: Until the business completes the channel picker, `channelId` is `"__pending__"`. The handler checks for this and bails early, so no conversations are created for incomplete setups.
- **`channels:join` scope**: Required so the bot can join the selected channel via `conversations.join` when the business saves their choice. Without this, the bot can receive events but cannot post.
- **Upsert on reconnect**: The callback uses `onConflictDoUpdate` on `teamId` so reconnecting a workspace to a different chatbot updates cleanly. The channel picker runs again, resetting the channel selection.
- **`EscalateToHumanTool`**: For Slack, escalation could ping a staff member directly or post in a designated internal channel using `withBotToken`. Out of scope for this spec but should be addressed before launch.
