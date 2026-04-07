# Telegram Integration

## Overview

This document specifies the Telegram integration for the platform. Unlike Discord, there is no OAuth bot-invite flow. Instead, each chatbot gets a shareable deep link (`https://t.me/yourbot?start=<chatbotId>`) that businesses distribute to their customers. Any customer who clicks it opens a DM with the bot, which routes the conversation to the correct chatbot config using the `chatbotId` embedded in the start parameter.

---

## Stack

- **Backend**: Hono on Bun
- **Frontend**: React with TanStack Router
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Chat SDK**: `chat`, `@chat-adapter/telegram`, `@chat-adapter/state-pg`
- **AI Agent**: `createSupportChatAgent` (existing)

---

## Architecture

```
Business opens "Telegram" tab on chatbot dashboard
        ↓
Dashboard displays shareable link + QR code (no backend call needed)
        ↓
Business shares link with their customers
        ↓
Customer clicks link → Telegram opens → DM with bot starts
        ↓
Bot receives /start <chatbotId>
        ↓
Bot looks up chatbot config by chatbotId
        ↓
Creates chat_conversation record (channel: "telegram")
        ↓
Saves user message to chat_message
        ↓
Runs createSupportChatAgent with chatbot config
        ↓
Saves assistant message to chat_message
        ↓
Posts response in Telegram DM
```

---

## 1. Database Schema

### 1.1 No New Table Required

There is no `telegram_connection` table. The `chatbotId` from the start parameter is the only routing key needed. It is stored directly on the conversation record.

### 1.2 Existing Tables Used

No changes needed to existing tables:

- `chat_conversation` — one record per Telegram user per chatbot, `channel: "telegram"`, `metadata` stores `telegramUserId`, `telegramChatId`, `chatbotId`
- `chat_message` — one record per message (user and assistant roles)

### 1.3 SDK-managed Tables

The Postgres state adapter auto-creates these on `bot.initialize()`:

- `chat_state_subscriptions`
- `chat_state_locks`
- `chat_state_cache`

---

## 2. Environment Variables

```bash
# Backend (.env)
TELEGRAM_BOT_TOKEN=              # BotFather → token
TELEGRAM_WEBHOOK_SECRET_TOKEN=   # random string you generate
TELEGRAM_BOT_USERNAME=           # e.g. yourbot (without @)

# Frontend (.env)
VITE_TELEGRAM_BOT_USERNAME=      # same value — baked in at build time

# Already set in your app
DATABASE_URL=
APP_URL=
API_URL=
```

---

## 3. Bot Instance

```typescript
// apps/api/src/lib/telegram-bot.ts
import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createPostgresState } from "@chat-adapter/state-pg";

export const telegramBot = new Chat({
  userName: process.env.TELEGRAM_BOT_USERNAME!,
  adapters: {
    telegram: createTelegramAdapter({
      mode: "webhook", // always webhook in production on Bun
    }),
  },
  state: createPostgresState(),
  // auto-detects DATABASE_URL
});

// register event handlers (imported for side effects)
import "@/lib/telegram-handlers";
```

### Local Development

For local dev, swap to polling mode so you don't need a public URL:

```typescript
// apps/api/src/lib/telegram-bot.ts (dev)
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";

export const telegramBot = new Chat({
  userName: process.env.TELEGRAM_BOT_USERNAME!,
  adapters: {
    telegram: createTelegramAdapter({ mode: "polling" }),
  },
  state: createMemoryState(),
});

void telegramBot.initialize(); // starts polling
```

Or use `mode: "auto"` and let the adapter decide — it picks polling when no webhook is detected, webhook when deployed.

---

## 4. Webhook Route

```typescript
// apps/api/src/routes/webhooks.ts (add alongside existing Discord handler)
import { telegramBot } from "@/lib/telegram-bot";

// POST /api/webhooks/telegram
webhooks.post("/telegram", async (c) => {
  const handler = telegramBot.webhooks["telegram"];

  if (!handler) {
    return c.json({ error: "Telegram adapter not configured" }, 404);
  }

  const response = await handler(c.req.raw, {
    waitUntil: (task) => {
      task.catch(console.error);
    },
  });

  return response;
});
```

### Register the Webhook with Telegram

Run this once after deploying (or on deploy):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/webhooks/telegram",
    "secret_token": "your-webhook-secret"
  }'
```

No cron job needed. Telegram pushes webhook events directly over HTTP — unlike Discord's Gateway, there is no persistent connection to maintain.

---

## 5. Bot Event Handlers

```typescript
// apps/api/src/lib/telegram-handlers.ts
import { telegramBot } from "./telegram-bot";
import { db } from "./db";
import { chatbot } from "@repo/db/schema/chatbot";
import { chatConversation, chatMessage } from "@repo/db/schema/chat";
import { createSupportChatAgent } from "@/agents/support-chat-agent";
import { eq, and, sql } from "drizzle-orm";

// ─── New Mention / DM ─────────────────────────────────────────────────────────
// Fires when a user messages the bot for the first time (including /start).

telegramBot.onNewMention(async (thread, message) => {
  const text = message.text ?? "";
  const telegramUserId = message.raw.from?.id?.toString();
  const telegramChatId = message.raw.chat?.id?.toString();

  // ── /start <chatbotId> ──
  if (text.startsWith("/start")) {
    const chatbotId = text.split(" ")[1]?.trim();

    if (!chatbotId) {
      await thread.post("Hi! To get started, use the link provided by the business.");
      return;
    }

    // verify chatbot exists
    const chatbotRecord = await db.query.chatbot.findFirst({
      where: eq(chatbot.id, chatbotId),
    });

    if (!chatbotRecord) {
      await thread.post("This link is invalid or the chatbot no longer exists.");
      return;
    }

    // create conversation
    const [conversation] = await db
      .insert(chatConversation)
      .values({
        chatbotId: chatbotRecord.id,
        organizationId: chatbotRecord.organizationId,
        channel: "telegram",
        metadata: {
          telegramUserId,
          telegramChatId,
          chatbotId: chatbotRecord.id,
        },
      })
      .returning();

    await thread.subscribe();

    // post greeting and return — no user message to respond to yet
    await thread.post(chatbotRecord.greeting ?? "Hi! How can I help you today?");
    return;
  }

  // ── Regular first message (no /start) ──
  // Look up an existing conversation for this user
  const conversation = await db.query.chatConversation.findFirst({
    where: and(
      eq(chatConversation.channel, "telegram"),
      sql`metadata->>'telegramChatId' = ${telegramChatId}`,
    ),
  });

  if (!conversation) {
    await thread.post("Please use the link provided to get started.");
    return;
  }

  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: conversation.chatbotId,
    organizationId: conversation.organizationId,
    role: "user",
    messageId: message.id,
    contentText: text,
  });

  await runAgentAndRespond({ thread, message, conversation });
});

// ─── Subscribed Message ───────────────────────────────────────────────────────
// Fires for follow-up messages after the bot has subscribed to the thread.

telegramBot.onSubscribedMessage(async (thread, message) => {
  const telegramChatId = message.raw.chat?.id?.toString();

  const conversation = await db.query.chatConversation.findFirst({
    where: and(
      eq(chatConversation.channel, "telegram"),
      sql`metadata->>'telegramChatId' = ${telegramChatId}`,
    ),
  });

  if (!conversation) return;

  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: conversation.chatbotId,
    organizationId: conversation.organizationId,
    role: "user",
    messageId: message.id,
    contentText: message.text ?? "",
  });

  await runAgentAndRespond({ thread, message, conversation });
});

// ─── Shared Agent Runner ──────────────────────────────────────────────────────

async function runAgentAndRespond({
  thread,
  message,
  conversation,
}: {
  thread: any;
  message: any;
  conversation: { id: string; chatbotId: string; organizationId: string };
}) {
  await thread.startTyping();

  const agent = createSupportChatAgent({
    chatbotId: conversation.chatbotId,
    organizationId: conversation.organizationId,
    conversationId: conversation.id,
    userId: message.raw.from?.id?.toString(),
  });

  const response = await agent.run(message.text ?? "");
  const responseText = response.text ?? "Sorry, I couldn't generate a response.";

  await db.insert(chatMessage).values({
    conversationId: conversation.id,
    chatbotId: conversation.chatbotId,
    organizationId: conversation.organizationId,
    role: "assistant",
    messageId: crypto.randomUUID(),
    contentText: responseText,
  });

  await thread.post(responseText);
}
```

---

## 6. Register Routes

```typescript
// apps/api/src/index.ts
import webhooks from "@/routes/webhooks"; // already registered — just add the telegram handler inside it
```

No new top-level route file needed. The Telegram webhook handler lives alongside the Discord one in `webhooks.ts`.

---

## 7. Frontend — Telegram Integration Page

No OAuth redirect, no backend call. The page just displays the shareable link and a QR code.

```bash
pnpm add qrcode.react
```

```tsx
// apps/web/src/routes/dashboard/chatbots/$chatbotId/integrations/telegram.tsx
import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/chatbots/$chatbotId/integrations/telegram")({
  component: TelegramIntegrationPage,
});

function TelegramIntegrationPage() {
  const { chatbotId } = Route.useParams();
  const [copied, setCopied] = useState(false);

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const link = `https://t.me/${botUsername}?start=${chatbotId}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h2>Telegram</h2>
      <p>
        Share this link with your customers. When they click it, Telegram opens and they can start
        chatting with your assistant immediately.
      </p>

      <div>
        <input value={link} readOnly />
        <button onClick={handleCopy}>{copied ? "Copied!" : "Copy link"}</button>
      </div>

      <QRCodeSVG value={link} size={180} />
      <p>Customers can also scan this QR code to open the chat directly.</p>
    </div>
  );
}
```

---

## 8. Local Development

1. Start your Bun dev server:

   ```bash
   bun run dev
   ```

2. Set `mode: "polling"` (or `"auto"`) in `telegram-bot.ts` — no ngrok needed.

3. Call `void telegramBot.initialize()` in your bot setup file to start polling.

4. Open `https://t.me/yourbot?start=<a-real-chatbot-uuid>` in Telegram to test.

5. Messages will arrive via polling and trigger your handlers exactly as they would in production via webhook.

---

## 9. BotFather Checklist

- [x] Created bot via [@BotFather](https://t.me/BotFather) — copied bot token
- [x] Set bot username — noted for `TELEGRAM_BOT_USERNAME`
- [ ] Disabled join groups (optional — since this is DM-only): `BotFather → Bot Settings → Allow Groups → Disable`
- [ ] Set webhook URL after deploying:
  ```bash
  curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://yourdomain.com/api/webhooks/telegram", "secret_token": "your-secret"}'
  ```

---

---

## 12. Key Constraints & Notes

- **DM only**: This integration is scoped to 1-on-1 DMs between the bot and end users. Adding the bot to groups/channels is a separate concern and out of scope.
- **One conversation per user per chatbot**: Matched on `metadata->>'telegramChatId'`. If a user clicks the link again, they resume the same thread.
- **No cron needed**: Telegram pushes webhook events over standard HTTP. No persistent Gateway connection to maintain.
- **`chatbotId` is not a secret**: It's safe to embed in a public link. It identifies a chatbot config, not credentials.
- **Polling vs webhook**: `mode: "polling"` deletes the webhook before calling `getUpdates` — don't run polling and webhook simultaneously.
