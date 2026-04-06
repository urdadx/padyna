# Discord Integration Spec

## Overview

This document specifies the full Discord integration — from OAuth bot invite flow, through guild-to-chatbot mapping, to wiring the Chat SDK with the existing AI agent. The goal is a shared-bot model where one Discord application serves all organizations, with per-guild routing to the correct chatbot and agent config.

---

## Stack

- **Backend**: Hono on Bun
- **Frontend**: React with TanStack Router
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Chat SDK**: `chat`, `@chat-adapter/discord`, `@chat-adapter/state-pg` already installed
- **AI Agent**: `createSupportChatAgent` (existing)

---

## Architecture

```
Business clicks "Connect Discord" on dashboard
        ↓
Discord OAuth invite flow → captures guildId
        ↓
guildId saved to discord_connection table (linked to chatbotId + organizationId)
        ↓
Customer @mentions bot in Discord server
        ↓
Chat SDK receives message via Gateway WebSocket → webhook
        ↓
Bot extracts guildId → looks up chatbot config
        ↓
Creates/resumes chat_conversation record (channel: "discord")
        ↓
Saves user message to chat_message
        ↓
Runs createSupportChatAgent with chatbot config
        ↓
Saves assistant message to chat_message
        ↓
Posts response in Discord thread
```

---

## 1. Database Schema

### 1.1 New Table: `discord`

Add this to your Drizzle schema. This is the bridge between a Discord server and a chatbot on your platform.

```typescript
// packages/db/src/schema/discord-connection.ts
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const discordConnection = pgTable(
  "discord_connection",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    guildId: text("guild_id").notNull(), // Discord server ID
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
    uniqueIndex("discord_connection_guild_id_uidx").on(table.guildId),
    index("discord_connection_chatbot_id_idx").on(table.chatbotId),
    index("discord_connection_organization_id_idx").on(table.organizationId),
  ],
);
```

### 1.2 Existing Tables Used

No changes needed to existing tables:

- `chat_conversation` — one record per Discord thread, `channel: "discord"`, `metadata` stores `guildId`, `channelId`, `threadId`
- `chat_message` — one record per message (user and assistant roles)

### 1.3 SDK-managed Tables

The Postgres state adapter auto-creates these on `bot.initialize()` — do not touch them:

- `chat_state_subscriptions`
- `chat_state_locks`
- `chat_state_cache`

---

## 2. Environment Variables

```bash
# Backend (.env)
# all neccessary env can be found in server.ts in the server folder
DISCORD_BOT_TOKEN=              # Bot → Reset Token
DISCORD_PUBLIC_KEY=             # General Information → Public Key
DISCORD_APPLICATION_ID=         # General Information → Application ID
DISCORD_CLIENT_SECRET=          # OAuth2 → Client Secret
DISCORD_REDIRECT_URI=           # http://localhost:3001/api/discord/callback (dev)
                                # https://yourdomain.com/api/discord/callback (prod)

CRON_SECRET=                    # random string you generate — protects gateway route

# Already set in your app
DATABASE_URL=
APP_URL=                        # http://localhost:3000 (frontend)
API_URL=                        # http://localhost:3001 (backend/Hono)
```

---

## 3. Bot Instance

Create a singleton bot instance. Import it wherever needed in your Hono app.

```typescript
// apps/api/src/lib/discord-bot.ts
import { Chat } from "chat";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createPostgresState } from "@chat-adapter/state-pg";

export const bot = new Chat({
  userName: "yourbot",
  adapters: {
    discord: createDiscordAdapter(),
    // auto-detects DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APPLICATION_ID
  },
  state: createPostgresState(),
  // auto-detects DATABASE_URL
});

// register event handlers (imported for side effects)
import "@/lib/discord-handlers";
```

---

## 4. OAuth Invite Flow

### 4.1 Invite URL Utility

```typescript
// apps/api/src/lib/discord-oauth.ts
export function getDiscordInviteUrl({
  chatbotId,
  organizationId,
}: {
  chatbotId: string;
  organizationId: string;
}): string {
  // encode chatbotId + organizationId in state so the callback knows who initiated
  const state = Buffer.from(JSON.stringify({ chatbotId, organizationId })).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_APPLICATION_ID!,
    scope: "bot applications.commands",
    permissions: "377957222464",
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: "code",
    state,
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
```

### 4.2 Hono Route — Get Invite URL

The frontend calls this to get the invite URL for a specific chatbot.

```typescript
// apps/api/src/routes/discord.ts
import { Hono } from "hono";
import { getDiscordInviteUrl } from "@/lib/discord-oauth";
import { db } from "@/lib/db";
import { discordConnection } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { bot } from "@/lib/discord-bot";

const discord = new Hono();

// GET /api/discord/invite-url?chatbotId=xxx
discord.get("/invite-url", async (c) => {
  const chatbotId = c.req.query("chatbotId");
  const organizationId = c.get("organizationId"); // from auth middleware

  if (!chatbotId) {
    return c.json({ error: "chatbotId is required" }, 400);
  }

  const url = getDiscordInviteUrl({ chatbotId, organizationId });
  return c.json({ url });
});
```

### 4.3 Hono Route — OAuth Callback

Discord redirects here after the business authorizes the bot into their server.

```typescript
// apps/api/src/routes/discord.ts (continued)

// GET /api/discord/callback
discord.get("/callback", async (c) => {
  const guildId = c.req.query("guild_id");
  const stateParam = c.req.query("state");
  const error = c.req.query("error");

  const appUrl = process.env.APP_URL!;

  // user cancelled or missing params
  if (error || !guildId || !stateParam) {
    return c.redirect(`${appUrl}/dashboard?discord=cancelled`);
  }

  let chatbotId: string;
  let organizationId: string;

  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    chatbotId = decoded.chatbotId;
    organizationId = decoded.organizationId;
  } catch {
    return c.redirect(`${appUrl}/dashboard?discord=error`);
  }

  // upsert — handles reconnect case cleanly
  await db
    .insert(discordConnection)
    .values({ guildId, chatbotId, organizationId })
    .onConflictDoUpdate({
      target: discordConnection.guildId,
      set: {
        chatbotId,
        organizationId,
        updatedAt: new Date(),
      },
    });

  return c.redirect(`${appUrl}/dashboard/chatbots/${chatbotId}?discord=connected`);
});

export default discord;
```

### 4.4 Register Routes in Hono App

```typescript
// apps/api/src/index.ts
import { Hono } from "hono";
import discord from "@/routes/discord";
import webhooks from "@/routes/webhooks";

const app = new Hono();

app.route("/api/discord", discord);
app.route("/api/webhooks", webhooks);

export default app;
```

---

## 5. Webhook Route

Handles incoming Discord events — button clicks, slash commands, and the initial verification PING.

```typescript
// apps/api/src/routes/webhooks.ts
import { Hono } from "hono";
import { bot } from "@/lib/discord-bot";

const webhooks = new Hono();

// POST /api/webhooks/discord
webhooks.post("/discord", async (c) => {
  const handler = bot.webhooks["discord"];

  if (!handler) {
    return c.json({ error: "Discord adapter not configured" }, 404);
  }

  const request = c.req.raw; // Hono exposes the raw Web API Request

  const response = await handler(request, {
    waitUntil: (task) => {
      task.catch(console.error);
    },
  });

  return response;
});

export default webhooks;
```

> Set **Interactions Endpoint URL** in the Discord Developer Portal to `https://yourdomain.com/api/webhooks/discord`.

---

## 6. Gateway Listener Route

Discord messages arrive via WebSocket (Gateway), not HTTP. This route starts the listener and must be hit on a schedule in production.

```typescript
// apps/api/src/routes/discord.ts (continued)

// GET /api/discord/gateway
discord.get("/gateway", async (c) => {
  // protect with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = c.req.header("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await bot.initialize();

  const discordAdapter = bot.getAdapter("discord");
  if (!discordAdapter) {
    return c.json({ error: "Discord adapter not found" }, 404);
  }

  const webhookUrl = `${process.env.API_URL}/api/webhooks/discord`;
  const durationMs = 10 * 60 * 1000; // 10 minutes

  return discordAdapter.startGatewayListener(
    {
      waitUntil: (task) => {
        task.catch(console.error);
      },
    },
    durationMs,
    undefined,
    webhookUrl,
  );
});
```

### Production Cron

Since you're on Bun (not Vercel), use an external cron service to hit the gateway route every 9 minutes:

```
GET https://yourdomain.com/api/discord/gateway
Authorization: Bearer YOUR_CRON_SECRET
Schedule: */9 * * * *
```

Options: Upstash QStash, Render cron jobs, Railway cron, or any cron service that supports HTTP requests with custom headers.

---

## 7. Bot Event Handlers

This is where routing and AI agent wiring happen.

```typescript
// apps/api/src/lib/discord-handlers.ts
import { bot } from "./discord-bot";
import { db } from "./db";
import { discordConnection } from "@repo/db/schema/discord-connection";
import { chatConversation, chatMessage } from "@repo/db/schema/chat";
import { createSupportChatAgent } from "@/agents/support-chat-agent";
import { eq, and, sql } from "drizzle-orm";

// ─── New Mention ──────────────────────────────────────────────────────────────
// Fires when a user @mentions the bot for the first time in a channel.
// Creates a conversation record and subscribes to the thread for follow-ups.

bot.onNewMention(async (thread, message) => {
  const guildId = message.raw.guild_id;

  // 1. find chatbot config for this Discord server
  const connection = await db.query.discordConnection.findFirst({
    where: eq(discordConnection.guildId, guildId),
  });

  if (!connection) {
    await thread.post(
      "This server hasn't been connected to a chatbot yet. Visit the dashboard to set it up.",
    );
    return;
  }

  // 2. create a conversation record
  const [conversation] = await db
    .insert(chatConversation)
    .values({
      chatbotId: connection.chatbotId,
      organizationId: connection.organizationId,
      channel: "discord",
      metadata: {
        guildId,
        channelId: message.raw.channel_id,
        threadId: thread.id,
        discordUserId: message.raw.author?.id,
      },
    })
    .returning();

  // 3. subscribe so follow-up messages trigger onSubscribedMessage
  await thread.subscribe();

  // 4. save user message
  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    role: "user",
    messageId: message.id,
    contentText: message.text,
  });

  // 5. run agent and respond
  await runAgentAndRespond({
    thread,
    message,
    connection,
    conversationId: conversation.id,
  });
});

// ─── Subscribed Message ───────────────────────────────────────────────────────
// Fires for follow-up messages in a thread the bot has already subscribed to.

bot.onSubscribedMessage(async (thread, message) => {
  const guildId = message.raw.guild_id;

  // 1. find connection for this server
  const connection = await db.query.discordConnection.findFirst({
    where: eq(discordConnection.guildId, guildId),
  });

  if (!connection) return;

  // 2. find existing conversation by threadId stored in metadata
  const conversation = await db.query.chatConversation.findFirst({
    where: and(
      eq(chatConversation.channel, "discord"),
      eq(chatConversation.chatbotId, connection.chatbotId),
      sql`metadata->>'threadId' = ${thread.id}`,
    ),
  });

  if (!conversation) return;

  // 3. save user message
  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    role: "user",
    messageId: message.id,
    contentText: message.text,
  });

  // 4. run agent and respond
  await runAgentAndRespond({
    thread,
    message,
    connection,
    conversationId: conversation.id,
  });
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
    userId: message.raw.author?.id,
  });

  const response = await agent.run(message.text);
  const responseText = response.text ?? "Sorry, I couldn't generate a response.";

  // save assistant message
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

## 8. Frontend — Connect Discord Button

Check the integratons.tsx page for the discord integration card and take it from there

````

---

## 9. Local Development

1. Start your Bun dev server:
   ```bash
   bun run dev
````

2. Start an ngrok tunnel pointing to your API port:

   ```bash
   ngrok http 3000
   ```

3. In the Discord Developer Portal, set **Interactions Endpoint URL** to:

   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/discord
   ```

4. Add redirect URI in Discord Developer Portal → OAuth2:

   ```
   http://localhost:3001/api/discord/callback
   ```

5. Trigger the Gateway listener by visiting in your browser (temporarily skip auth check in dev):

   ```
   http://localhost:3001/api/discord/gateway
   ```

6. Open the invite URL from `GET /api/discord/invite-url` and add the bot to a test server.

7. @mention the bot in a channel — it should create a conversation and respond.

---

## 12. Key Constraints & Notes

- **One bot, many servers**: Your single Discord application serves all organizations. The `guildId` is the only routing key.
- **One conversation per thread**: `onNewMention` creates the conversation, `onSubscribedMessage` resumes it. Match on `metadata->>'threadId'`.
- **SDK state vs your schema**: The Postgres state adapter manages `chat_state_*` tables internally for thread subscriptions and locking. Your `chat_conversation` and `chat_message` tables are entirely separate.
- **Upsert on reconnect**: The callback uses `onConflictDoUpdate` on `guildId` so reconnecting a server to a different chatbot updates cleanly.

- **Gateway overlap**: 9-minute cron + 10-minute listener duration = 1-minute intentional overlap to ensure no gap in connectivity.
- **`EscalateToHumanTool`**: Currently assumes a web chat context. For Discord, escalation should ping a staff role or post in a designated support channel. Out of scope for this spec but should be addressed before launch.

# USING BUN FOR CRON

// apps/api/src/index.ts
Bun.cron("_/9 _ \* \* \*", async () => {
const discordAdapter = bot.getAdapter("discord");
if (!discordAdapter) return;

const webhookUrl = `${process.env.API_URL}/api/webhooks/discord`;
const durationMs = 10 _ 60 _ 1000;

await discordAdapter.startGatewayListener(
{ waitUntil: (task) => { task.catch(console.error); } },
durationMs,
undefined,
webhookUrl,
);
});

A few things worth noting for your setup:

_/9 _ \* \* \* works fine — 9 doesn't divide 60 evenly, but the Windows trigger limit only matters for OS-level Bun.cron(path, schedule, title). You're using in-process Bun.cron(schedule, handler), so no restrictions apply.
No-overlap guarantee — Bun won't fire the next invocation until the previous one's promise settles. Since startGatewayListener presumably runs for ~10 minutes, you'd want to verify it actually resolves after the duration rather than hanging. If it does hang, the cron would stall. You may want a timeout wrapper around it just in case.
You can remove the /api/discord/gateway route entirely — no need for the external HTTP cron hit or the CRON_SECRET env var anymore.
Shared state — the in-process approach means the bot singleton and DB pool are shared across invocations, which is exactly what you want.
