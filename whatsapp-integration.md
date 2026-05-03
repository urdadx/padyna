# WhatsApp Integration

## Overview

This document specifies the WhatsApp integration using Meta's Embedded Signup flow. Businesses connect their WhatsApp Business number directly from your dashboard via a Meta-hosted popup — no manual credential copying. Each connection is scoped to a specific chatbot. The `phoneNumberId` is the routing key, mapping each WhatsApp number to a `chatbotId` + `organizationId`.

---

## Stack

- **Backend**: Hono on Bun
- **Frontend**: React with TanStack Router
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Chat SDK**: `chat`, `@chat-adapter/whatsapp`, `@chat-adapter/state-pg`
- **AI Agent**: `createSupportChatAgent` (existing)

---

## Architecture

```
Business clicks "Connect WhatsApp" on dashboard
        ↓
Meta Embedded Signup popup opens in browser
        ↓
Business logs in with Facebook, selects business profile, adds phone number
        ↓
Meta redirects to callback with code + state (chatbotId + organizationId)
        ↓
Backend exchanges code for access token → gets phoneNumberId + wabaId
        ↓
Credentials saved (encrypted) to whatsapp_connection table
        ↓
Customer sends WhatsApp message to business number
        ↓
Meta sends webhook → bot extracts phoneNumberId → looks up chatbot config
        ↓
Creates/resumes chat_conversation record (channel: "whatsapp")
        ↓
Saves user message to chat_message
        ↓
Runs createSupportChatAgent with chatbot config
        ↓
Saves assistant message to chat_message
        ↓
Sends response via WhatsApp Cloud API
```

---

## 1. Database Schema

### 1.1 New Table: `whatsapp_connection`

```typescript
// packages/db/src/schema/whatsapp-connection.ts
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const whatsappConnection = pgTable(
  "whatsapp_connection",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    phoneNumberId: text("phone_number_id").notNull(), // routing key — Meta phone number ID
    wabaId: text("waba_id").notNull(), // WhatsApp Business Account ID
    accessToken: text("access_token").notNull(), // encrypted System User token
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
    uniqueIndex("whatsapp_connection_phone_number_id_uidx").on(table.phoneNumberId),
    index("whatsapp_connection_chatbot_id_idx").on(table.chatbotId),
    index("whatsapp_connection_organization_id_idx").on(table.organizationId),
  ],
);
```

### 1.2 Existing Tables Used

No changes needed:

- `chat_conversation` — one record per WhatsApp contact per chatbot, `channel: "whatsapp"`, `metadata` stores `phoneNumberId`, `wabaId`, `customerPhone`
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
META_APP_ID=                     # Meta app → Basic Settings → App ID
META_APP_SECRET=                 # Meta app → Basic Settings → App Secret
META_WEBHOOK_VERIFY_TOKEN=       # random string you generate — shared across all connections
ENCRYPTION_KEY=                  # base64 32-byte key — encrypts access tokens at rest

# Already set in your app
DATABASE_URL=
APP_URL=                         # http://localhost:3000 (frontend)
API_URL=                         # http://localhost:3001 (backend/Hono)
```

Generate the encryption key:

```bash
openssl rand -base64 32
```

Generate the webhook verify token:

```bash
openssl rand -hex 32
```

---

## 3. Token Encryption Utility

Access tokens must be encrypted at rest since they grant access to the business's WhatsApp number.

```typescript
// apps/api/src/lib/encryption.ts
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
const ALGO = "aes-256-gcm";

export function encrypt(text: string): string {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [Buffer.from(iv).toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(
    ":",
  );
}

export function decrypt(encoded: string): string {
  const [ivHex, tagHex, encHex] = encoded.split(":");
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}
```

---

## 4. Bot Instance

Unlike Discord and Slack, there is no single shared bot instance. Each WhatsApp connection has its own credentials, so bot instances are created dynamically per webhook request using the connection's decrypted token.

```typescript
// apps/api/src/lib/whatsapp-bot.ts
import { Chat } from "chat";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { createPostgresState } from "@chat-adapter/state-pg";

export function createWhatsAppBot({
  accessToken,
  phoneNumberId,
}: {
  accessToken: string;
  phoneNumberId: string;
}) {
  return new Chat({
    adapters: {
      whatsapp: createWhatsAppAdapter({
        accessToken,
        phoneNumberId,
        appSecret: process.env.META_APP_SECRET!,
        verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN!,
      }),
    },
    state: createPostgresState(),
  });
}
```

---

## 5. Embedded Signup OAuth Flow

### 5.1 Frontend — Embedded Signup Button

Meta's Embedded Signup uses the Facebook JavaScript SDK to open a popup. Install the SDK via CDN in your HTML root, then trigger it from React.

```tsx
// apps/web/src/routes/dashboard/chatbots/$chatbotId/integrations/whatsapp.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  whatsapp: z.enum(["connected", "cancelled", "error"]).optional(),
});

export const Route = createFileRoute("/dashboard/chatbots/$chatbotId/integrations/whatsapp")({
  validateSearch: searchSchema,
  component: WhatsAppIntegrationPage,
});

// load Facebook SDK once
function loadFacebookSDK() {
  if (document.getElementById("facebook-jssdk")) return;
  const script = document.createElement("script");
  script.id = "facebook-jssdk";
  script.src = "https://connect.facebook.net/en_US/sdk.js";
  document.body.appendChild(script);

  window.fbAsyncInit = () => {
    window.FB.init({
      appId: import.meta.env.VITE_META_APP_ID,
      autoLogAppEvents: true,
      xfbml: true,
      version: "v21.0",
    });
  };
}

function WhatsAppIntegrationPage() {
  const { chatbotId } = Route.useParams();
  const { whatsapp } = Route.useSearch();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFacebookSDK();
  }, []);

  function handleConnect() {
    setLoading(true);

    // encode chatbotId in state so the backend callback knows the scope
    const state = btoa(JSON.stringify({ chatbotId }));

    window.FB.login(
      async (response) => {
        if (response.authResponse?.code) {
          // send code to your backend to exchange for access token
          await fetch("/api/whatsapp/callback", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: response.authResponse.code,
              state,
            }),
          });

          window.location.href = `/dashboard/chatbots/${chatbotId}?whatsapp=connected`;
        } else {
          setLoading(false);
        }
      },
      {
        config_id: import.meta.env.VITE_META_CONFIG_ID, // from Meta app Embedded Signup config
        response_type: "code",
        override_default_response_type: true,
        extras: { state },
      },
    );
  }

  return (
    <div>
      {whatsapp === "connected" && <p>WhatsApp connected successfully!</p>}
      {whatsapp === "error" && <p>Something went wrong. Please try again.</p>}

      <h2>Connect WhatsApp</h2>
      <p>
        Connect your WhatsApp Business number to let your assistant reply to customer messages
        automatically.
      </p>

      <button onClick={handleConnect} disabled={loading}>
        {loading ? "Connecting..." : "Connect WhatsApp"}
      </button>
    </div>
  );
}
```

Add to your frontend `.env`:

```bash
VITE_META_APP_ID=                # same as META_APP_ID
VITE_META_CONFIG_ID=             # Meta app → Embedded Signup → Configuration ID
```

### 5.2 Hono Route — OAuth Callback

Receives the code from the frontend, exchanges it for tokens, fetches the phone number ID and WABA ID, saves the connection.

```typescript
// apps/api/src/routes/whatsapp.ts
import { Hono } from "hono";
import { db } from "@/lib/db";
import { whatsappConnection } from "@repo/db/schema";
import { encrypt } from "@/lib/encryption";
import { eq } from "drizzle-orm";

const whatsapp = new Hono();

// POST /api/whatsapp/callback
whatsapp.post("/callback", async (c) => {
  const organizationId = c.get("organizationId"); // from auth middleware
  const { code, state } = await c.req.json();

  let chatbotId: string;
  try {
    const decoded = JSON.parse(atob(state));
    chatbotId = decoded.chatbotId;
  } catch {
    return c.json({ error: "Invalid state" }, 400);
  }

  // 1. exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: "", // not used for Embedded Signup code exchange
        code,
      }),
  );
  const tokenData = (await tokenRes.json()) as any;
  const userAccessToken = tokenData.access_token;

  if (!userAccessToken) {
    return c.json({ error: "Failed to exchange code" }, 400);
  }

  // 2. fetch WhatsApp Business Accounts linked to this user
  const wabaRes = await fetch(
    `https://graph.facebook.com/v21.0/me/businesses?access_token=${userAccessToken}`,
  );
  const wabaData = (await wabaRes.json()) as any;
  const wabaId = wabaData.data?.[0]?.id;

  if (!wabaId) {
    return c.json({ error: "No WhatsApp Business Account found" }, 400);
  }

  // 3. fetch phone numbers for this WABA
  const phoneRes = await fetch(
    `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${userAccessToken}`,
  );
  const phoneData = (await phoneRes.json()) as any;
  const phoneNumberId = phoneData.data?.[0]?.id;

  if (!phoneNumberId) {
    return c.json({ error: "No phone number found" }, 400);
  }

  // 4. generate a system user token
  // in production: use Meta's System User flow for a permanent token
  // for now, store the user token (note: expires in ~60 days)
  const encryptedToken = encrypt(userAccessToken);

  // 5. upsert connection
  await db
    .insert(whatsappConnection)
    .values({
      phoneNumberId,
      wabaId,
      accessToken: encryptedToken,
      chatbotId,
      organizationId,
    })
    .onConflictDoUpdate({
      target: whatsappConnection.phoneNumberId,
      set: {
        wabaId,
        accessToken: encryptedToken,
        chatbotId,
        organizationId,
        updatedAt: new Date(),
      },
    });

  // 6. register webhook for this WABA
  await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  return c.json({ ok: true });
});

export default whatsapp;
```

---

## 6. Webhook Route

WhatsApp webhooks have two parts: a GET for initial verification, and a POST for incoming events.

```typescript
// apps/api/src/routes/webhooks.ts (add alongside Discord, Telegram, Slack)
import { db } from "@/lib/db";
import { whatsappConnection } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { createWhatsAppBot } from "@/lib/whatsapp-bot";

// GET /api/webhooks/whatsapp — Meta verification handshake
webhooks.get("/whatsapp", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return c.text(challenge ?? "");
  }

  return c.json({ error: "Forbidden" }, 403);
});

// POST /api/webhooks/whatsapp — incoming messages
webhooks.post("/whatsapp", async (c) => {
  const body = (await c.req.json()) as any;

  // extract phoneNumberId from payload
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const phoneNumberId = change?.value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return c.json({ ok: true }); // ack but ignore
  }

  // look up connection for this phone number
  const connection = await db.query.whatsappConnection.findFirst({
    where: eq(whatsappConnection.phoneNumberId, phoneNumberId),
  });

  if (!connection) {
    return c.json({ ok: true }); // unknown number — ignore
  }

  const accessToken = decrypt(connection.accessToken);
  const bot = createWhatsAppBot({ accessToken, phoneNumberId });
  await bot.initialize();

  const handler = bot.webhooks["whatsapp"];
  if (!handler) return c.json({ ok: true });

  // attach connection context for handlers
  const response = await handler(c.req.raw, {
    waitUntil: (task) => {
      task.catch(console.error);
    },
    context: { connection },
  });

  return response;
});
```

---

## 7. Bot Event Handlers

Since bot instances are created dynamically, handlers are registered on each bot instance rather than a shared singleton. Extract this into a setup function called when creating the bot.

```typescript
// apps/api/src/lib/whatsapp-bot.ts (updated)
import { Chat } from "chat";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { createPostgresState } from "@chat-adapter/state-pg";
import { db } from "./db";
import { chatConversation, chatMessage } from "@repo/db/schema/chat";
import { createSupportChatAgent } from "@/agents/support-chat-agent";
import { and, eq, sql } from "drizzle-orm";

export function createWhatsAppBot({
  accessToken,
  phoneNumberId,
  connection,
}: {
  accessToken: string;
  phoneNumberId: string;
  connection: { chatbotId: string; organizationId: string; wabaId: string };
}) {
  const bot = new Chat({
    adapters: {
      whatsapp: createWhatsAppAdapter({
        accessToken,
        phoneNumberId,
        appSecret: process.env.META_APP_SECRET!,
        verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN!,
      }),
    },
    state: createPostgresState(),
  });

  // ─── New Message ────────────────────────────────────────────────────────────

  bot.onNewMention(async (thread, message) => {
    const customerPhone = message.raw.from;

    // create conversation
    const [conversation] = await db
      .insert(chatConversation)
      .values({
        chatbotId: connection.chatbotId,
        organizationId: connection.organizationId,
        channel: "whatsapp",
        metadata: {
          phoneNumberId,
          wabaId: connection.wabaId,
          customerPhone,
        },
      })
      .returning();

    await thread.subscribe();

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

  // ─── Follow-up Message ──────────────────────────────────────────────────────

  bot.onSubscribedMessage(async (thread, message) => {
    const customerPhone = message.raw.from;

    const conversation = await db.query.chatConversation.findFirst({
      where: and(
        eq(chatConversation.channel, "whatsapp"),
        eq(chatConversation.chatbotId, connection.chatbotId),
        sql`metadata->>'customerPhone' = ${customerPhone}`,
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

  return bot;
}

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
  const agent = createSupportChatAgent({
    chatbotId: connection.chatbotId,
    organizationId: connection.organizationId,
    conversationId,
    userId: message.raw.from,
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

## 8. Register Routes

```typescript
// apps/api/src/index.ts
import whatsapp from "@/routes/whatsapp";

app.route("/api/whatsapp", whatsapp);
```

---

## 9. Meta App Setup

### 9.1 Create the Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. Select **Business** as the app type
3. Add the **WhatsApp** product to your app

### 9.2 Configure Embedded Signup

1. In your Meta app → **WhatsApp → Embedded Signup**
2. Create a configuration — note the **Configuration ID** → `VITE_META_CONFIG_ID`
3. Set the following scopes in the configuration:
   ```
   whatsapp_business_management
   whatsapp_business_messaging
   business_management
   ```

### 9.3 Configure Webhook

1. Meta app → **WhatsApp → Configuration → Webhook**
2. Set Callback URL: `https://yourdomain.com/api/webhooks/whatsapp`
3. Set Verify Token: same value as `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to: `messages`

### 9.4 Note Your Credentials

- **App ID** → `META_APP_ID` + `VITE_META_APP_ID`
- **App Secret** → `META_APP_SECRET`

---

## 10. Local Development

1. Start your Bun dev server:

   ```bash
   bun run dev
   ```

2. Start an ngrok tunnel:

   ```bash
   ngrok http 3001
   ```

3. Set Webhook Callback URL in Meta app to:

   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/whatsapp
   ```

4. Click **Verify and Save** — Meta will hit your GET endpoint to verify.

5. Open the WhatsApp integration page on your dashboard and click **Connect WhatsApp**.

6. Complete the Embedded Signup popup with a test business account.

7. Send a message to the connected WhatsApp number — it should respond.

---

## 11. Meta App Checklist

- [ ] Created Meta app (type: Business)
- [ ] Added WhatsApp product
- [ ] Configured Embedded Signup — noted Configuration ID
- [ ] Set Embedded Signup scopes: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`
- [ ] Set Webhook Callback URL → `https://yourdomain.com/api/webhooks/whatsapp`
- [ ] Set Webhook Verify Token → matches `META_WEBHOOK_VERIFY_TOKEN`
- [ ] Subscribed to `messages` webhook field
- [ ] Copied App ID, App Secret → env vars
- [ ] Generated `ENCRYPTION_KEY` and `META_WEBHOOK_VERIFY_TOKEN`

## 14. Key Constraints & Notes

- **Dynamic bot instances**: Unlike Discord/Slack/Telegram where one bot singleton serves all organizations, each WhatsApp connection gets its own bot instance created at webhook time. This is necessary because each business has their own access token.
- **Token expiry**: User access tokens from Embedded Signup expire in ~60 days. For production, implement Meta's System User Token flow to get a permanent token. Store a `tokenExpiresAt` column and refresh before expiry.
- **One phone number per chatbot**: A WhatsApp Business number can only be connected to one chatbot at a time. Reconnecting updates the existing record via upsert on `phoneNumberId`.
- **No typing indicator**: WhatsApp Cloud API does not support typing indicators — remove `thread.startTyping()` calls.
- **24-hour messaging window**: WhatsApp restricts outbound messages to within 24 hours of the last customer message. Outside this window you must use pre-approved Message Templates. Out of scope for this spec but required before launch.
- **`EscalateToHumanTool`**: For WhatsApp, escalation should notify the business via a separate channel (email, internal Slack, etc.) since there's no concept of staff roles in WhatsApp. Out of scope for this spec.
- **Webhook verify token is shared**: Unlike the per-connection tokens, `META_WEBHOOK_VERIFY_TOKEN` is a single value used across all connections for the initial webhook handshake. This is fine — it's not a secret that grants API access.
