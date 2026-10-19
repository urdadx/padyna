import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { db } from "@padyna/db";
import { chatbot, chatConversation, chatMessage } from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";
import { and, eq, asc } from "drizzle-orm";
import { Hono } from "hono";
import { createSupportChatAgent } from "../chat";
import {
  getLatestUserText,
  prefetchKnowledge,
  streamAgentResponse,
} from "../chat/knowledge-first-stream";
import { TtlCache } from "../lib/ttl-cache";
import {
  ConversationAccessError,
  getConversationStatus,
  getUserMetadataFromRequest,
  persistConversationMessages,
} from "../chat/chat-utils";
import { initializeLiveChatConversation } from "../chat/live-chat-service";
import { broadcastConversationStatusUpdate } from "../chat/live-chat-service";
import { createRateLimitMiddleware, getClientIp } from "../lib/ratelimiter";
import {
  isOriginAllowed,
  parseIncomingUserMessage,
  parseOrigin,
  resolveEmbedOrigin,
} from "./widget-request";
import {
  organizationHasBrandingAddon,
  resolveHidePoweredBy,
} from "@padyna/api/lib/subscription-entitlements";

function getLiveChatToken(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) {
    return null;
  }

  const token = metadata.liveChatToken;
  if (typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PublicWidgetChatbot = {
  id: string;
  organizationId: string;
  name: string | null;
  image: string | null;
  primaryColor: string;
  hidePoweredBy: boolean;
  suggestedMessages: string[] | null;
  launcherMessage: string;
  initialMessage: string;
  isEnabled: boolean;
  usecase: "support" | "technical" | "sales";
  allowedDomains: string[] | null;
};

export const widgetRoutes = new Hono();

function resolveConversationChannel(c: any): "web" | "widget" {
  const platform = c.req.query("platform");
  if (platform === "web") {
    return "web";
  }

  return "widget";
}

const WIDGET_CHAT_RATE_LIMIT_MAX_REQUESTS = 12;
const WIDGET_CHAT_RATE_LIMIT_WINDOW_SECONDS = 60;
const widgetChatRateLimitMiddleware = createRateLimitMiddleware({
  namespace: "chat-widget-generation",
  maxRequests: WIDGET_CHAT_RATE_LIMIT_MAX_REQUESTS,
  windowSeconds: WIDGET_CHAT_RATE_LIMIT_WINDOW_SECONDS,
  resolveIdentifier: (c) => {
    const widgetId = c.req.param("widgetId");
    const clientIp = getClientIp(c);
    return `${widgetId}:${clientIp}`;
  },
});

function buildWidgetConfig(chatbotRecord: PublicWidgetChatbot, hasBrandingAddon: boolean) {
  return {
    id: chatbotRecord.id,
    name: chatbotRecord.name,
    image: chatbotRecord.image,
    primaryColor: chatbotRecord.primaryColor,
    hidePoweredBy: resolveHidePoweredBy({
      hasBrandingAddon,
      hidePoweredBy: chatbotRecord.hidePoweredBy,
    }),
    suggestedMessages: chatbotRecord.suggestedMessages ?? [],
    launcherMessage: chatbotRecord.launcherMessage,
    initialMessage: chatbotRecord.initialMessage,
    isEnabled: chatbotRecord.isEnabled,
  };
}

const widgetAppOrigin = parseOrigin(env.CORS_ORIGIN);

function getRequestOrigin(c: any): string | null {
  return resolveEmbedOrigin({
    origin: c.req.header("origin"),
    referer: c.req.header("referer"),
    hostOriginHint: c.req.query("hostOrigin"),
    widgetAppOrigin,
  });
}

function convertDbMessagesToUiMessages(rows: any[]) {
  return rows.map((row) => ({
    id: row.messageId,
    role: row.role,
    parts: Array.isArray(row.parts) ? row.parts : [{ type: "text", text: row.contentText || "" }],
  }));
}

async function loadConversationUiMessages(conversationId: string, chatbotId: string) {
  const rows = await db
    .select({
      messageId: chatMessage.messageId,
      role: chatMessage.role,
      contentText: chatMessage.contentText,
      parts: chatMessage.parts,
    })
    .from(chatMessage)
    .where(and(eq(chatMessage.conversationId, conversationId), eq(chatMessage.chatbotId, chatbotId)))
    .orderBy(asc(chatMessage.createdAt));

  return convertDbMessagesToUiMessages(rows);
}

// Every widget request (config, init, each chat message) starts with this lookup.
// A short TTL keeps dashboard edits (enabled, allowed domains) live within seconds.
const widgetChatbotCache = new TtlCache<string, PublicWidgetChatbot | null>({
  ttlMs: 15_000,
  maxSize: 1_000,
});

async function getWidgetChatbot(widgetId: string) {
  const cached = widgetChatbotCache.get(widgetId);
  if (cached !== undefined) {
    return cached ?? undefined;
  }

  const record = await loadWidgetChatbot(widgetId);
  widgetChatbotCache.set(widgetId, record ?? null);
  return record;
}

async function loadWidgetChatbot(widgetId: string) {
  const rows = await db
    .select({
      id: chatbot.id,
      organizationId: chatbot.organizationId,
      name: chatbot.name,
      image: chatbot.image,
      primaryColor: chatbot.primaryColor,
      hidePoweredBy: chatbot.hidePoweredBy,
      suggestedMessages: chatbot.suggestedMessages,
      launcherMessage: chatbot.launcherMessage,
      initialMessage: chatbot.initialMessage,
      isEnabled: chatbot.isEnabled,
      usecase: chatbot.usecase,
      allowedDomains: chatbot.allowedDomains,
    })
    .from(chatbot)
    .where(eq(chatbot.embedToken, widgetId))
    .limit(1);

  return rows[0] as PublicWidgetChatbot | undefined;
}

async function resolveWidgetRequest(
  c: any,
  options: { requireEnabled?: boolean; includeBranding?: boolean } = {},
): Promise<
  | {
      chatbotRecord: PublicWidgetChatbot;
      requestOrigin: string | null;
      hasBrandingAddon: boolean;
    }
  | Response
> {
  const widgetId = c.req.param("widgetId");
  const chatbotRecord = await getWidgetChatbot(widgetId);

  if (!chatbotRecord) {
    return c.json({ message: "Widget not found" }, 404);
  }

  if (options.requireEnabled && !chatbotRecord.isEnabled) {
    return c.json({ message: "Widget is disabled" }, 403);
  }

  const requestOrigin = getRequestOrigin(c);
  if (!isOriginAllowed(chatbotRecord.allowedDomains, requestOrigin)) {
    return c.json({ message: "Domain not allowed" }, 403);
  }

  // Only config and init render the "Powered by" badge; chat requests skip the lookup.
  const hasBrandingAddon =
    options.includeBranding === false
      ? false
      : await organizationHasBrandingAddon(chatbotRecord.organizationId);

  return { chatbotRecord, requestOrigin, hasBrandingAddon };
}

widgetRoutes.get("/:widgetId/config", async (c) => {
  const resolved = await resolveWidgetRequest(c, { requireEnabled: true });
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord, hasBrandingAddon } = resolved;

  return c.json(buildWidgetConfig(chatbotRecord, hasBrandingAddon));
});

widgetRoutes.post("/:widgetId/init", async (c) => {
  const resolved = await resolveWidgetRequest(c);
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord, hasBrandingAddon } = resolved;

  const { conversationId } = await c.req.json();

  let messages: any[] = [];
  let conversationStatus: string | null = null;
  let liveChatToken: string | null = null;

  if (typeof conversationId === "string" && conversationId.length > 0) {
    // Scoped to this widget's chatbot: a conversation id from another chatbot or organization
    // is treated as unknown, so its transcript and live chat token are never returned.
    const [conversation] = await db
      .select({ status: chatConversation.status, metadata: chatConversation.metadata })
      .from(chatConversation)
      .where(
        and(
          eq(chatConversation.id, conversationId),
          eq(chatConversation.chatbotId, chatbotRecord.id),
          eq(chatConversation.organizationId, chatbotRecord.organizationId),
        ),
      )
      .limit(1);

    if (conversation) {
      conversationStatus = conversation.status ?? null;

      if (conversation.status === "escalated" || conversation.status === "assigned") {
        const initialized = await initializeLiveChatConversation({
          conversationId,
        });
        liveChatToken =
          initialized?.liveChatToken ?? getLiveChatToken(conversation.metadata) ?? null;
      }

      messages = await loadConversationUiMessages(conversationId, chatbotRecord.id);
    }
  }

  return c.json({
    config: buildWidgetConfig(chatbotRecord, hasBrandingAddon),
    messages,
    conversationStatus,
    liveChatToken,
  });
});

widgetRoutes.post("/:widgetId/chat", widgetChatRateLimitMiddleware, async (c) => {
  const resolved = await resolveWidgetRequest(c, { requireEnabled: true, includeBranding: false });
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord, requestOrigin } = resolved;
  const channel = resolveConversationChannel(c);

  const { id: conversationId, message } = await c.req.json();

  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return c.json({ message: "id is required" }, 400);
  }

  const userMessage = parseIncomingUserMessage(message);
  if (!userMessage) {
    return c.json({ message: "message must be a user message with text" }, 400);
  }

  // Start the knowledge search now; it runs while the message is stored and the
  // agent is set up, and lets the model answer without a separate search step.
  const prefetchPromise = prefetchKnowledge({
    query: getLatestUserText([userMessage]),
    chatbotId: chatbotRecord.id,
    organizationId: chatbotRecord.organizationId,
  });

  const visitorMetadata = requestOrigin ? getUserMetadataFromRequest(c) : undefined;

  let targetConversationId: string | undefined;
  try {
    targetConversationId = await persistConversationMessages({
      chatbotId: chatbotRecord.id,
      organizationId: chatbotRecord.organizationId,
      userId: undefined,
      channel,
      messages: [userMessage],
      metadata: visitorMetadata,
      title: userMessage.parts[0]?.text,
      conversationId,
    });
  } catch (error) {
    if (error instanceof ConversationAccessError) {
      return c.json({ message: "Conversation not found" }, 404);
    }
    throw error;
  }

  const resolvedConversationId = targetConversationId ?? conversationId;

  const [uiMessages, status, agent, prefetched] = await Promise.all([
    // History comes from the database, never from the client.
    loadConversationUiMessages(resolvedConversationId, chatbotRecord.id),
    targetConversationId ? getConversationStatus(targetConversationId) : null,
    createSupportChatAgent({
      chatbotId: chatbotRecord.id,
      organizationId: chatbotRecord.organizationId,
      chatbotName: chatbotRecord.name || "AI Assistant",
      chatbotUseCase: chatbotRecord.usecase || "support",
      conversationId: resolvedConversationId,
    }),
    prefetchPromise,
  ]);

  if (targetConversationId && (status === "escalated" || status === "assigned" || status === "closed")) {
    if (status === "escalated" || status === "assigned") {
      broadcastConversationStatusUpdate({
        conversationId: targetConversationId,
        status,
      });
    }

    const stream = createUIMessageStream({
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  return streamAgentResponse({
    agent,
    uiMessages,
    prefetched,
    onFinish: async (completedMessages) => {
      await persistConversationMessages({
        chatbotId: chatbotRecord.id,
        organizationId: chatbotRecord.organizationId,
        userId: undefined,
        channel,
        messages: completedMessages as any,
        metadata: visitorMetadata,
        conversationId: resolvedConversationId,
      });
    },
  });
});
