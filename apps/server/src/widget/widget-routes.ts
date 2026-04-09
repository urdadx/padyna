import {
  createAgentUIStreamResponse,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { db } from "@padyna/db";
import { chatbot, chatConversation, chatMessage } from "@padyna/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { Hono } from "hono";
import { createSupportChatAgent } from "../chat";
import {
  getConversationStatus,
  getUserMetadataFromRequest,
  persistConversationMessages,
} from "../chat/chat-utils";
import { initializeLiveChatConversation } from "../chat/live-chat-service";
import { broadcastConversationStatusUpdate } from "../chat/live-chat-service";
import { createRateLimitMiddleware, getClientIp } from "../lib/ratelimiter";

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

function buildWidgetConfig(chatbotRecord: PublicWidgetChatbot) {
  return {
    id: chatbotRecord.id,
    name: chatbotRecord.name,
    image: chatbotRecord.image,
    primaryColor: chatbotRecord.primaryColor,
    hidePoweredBy: chatbotRecord.hidePoweredBy,
    suggestedMessages: chatbotRecord.suggestedMessages ?? [],
    initialMessage: chatbotRecord.initialMessage,
    isEnabled: chatbotRecord.isEnabled,
  };
}

function parseOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeAllowedDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = parseOrigin(trimmed);
  if (direct) {
    return direct;
  }

  return parseOrigin(`https://${trimmed}`);
}

function getRequestOrigin(c: any): string | null {
  const hostOrigin = parseOrigin(c.req.query("hostOrigin"));
  if (hostOrigin) {
    return hostOrigin;
  }

  const origin = parseOrigin(c.req.header("origin"));
  if (origin) {
    return origin;
  }

  return parseOrigin(c.req.header("referer"));
}

function isDomainAllowed(chatbotRecord: PublicWidgetChatbot, requestOrigin: string | null) {
  const allowed = (chatbotRecord.allowedDomains ?? [])
    .map(normalizeAllowedDomain)
    .filter((entry): entry is string => entry !== null);

  if (allowed.length === 0) {
    return true;
  }

  if (!requestOrigin) {
    return false;
  }

  return allowed.includes(requestOrigin);
}

function convertDbMessagesToUiMessages(rows: any[]) {
  return rows.map((row) => ({
    id: row.messageId,
    role: row.role,
    parts: Array.isArray(row.parts) ? row.parts : [{ type: "text", text: row.contentText || "" }],
  }));
}

async function getWidgetChatbot(widgetId: string) {
  const rows = await db
    .select({
      id: chatbot.id,
      organizationId: chatbot.organizationId,
      name: chatbot.name,
      image: chatbot.image,
      primaryColor: chatbot.primaryColor,
      hidePoweredBy: chatbot.hidePoweredBy,
      suggestedMessages: chatbot.suggestedMessages,
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
  options: { requireEnabled?: boolean } = {},
): Promise<{ chatbotRecord: PublicWidgetChatbot; requestOrigin: string | null } | Response> {
  const widgetId = c.req.param("widgetId");
  const chatbotRecord = await getWidgetChatbot(widgetId);

  if (!chatbotRecord) {
    return c.json({ message: "Widget not found" }, 404);
  }

  if (options.requireEnabled && !chatbotRecord.isEnabled) {
    return c.json({ message: "Widget is disabled" }, 403);
  }

  const requestOrigin = getRequestOrigin(c);
  if (!isDomainAllowed(chatbotRecord, requestOrigin)) {
    return c.json({ message: "Domain not allowed" }, 403);
  }

  return { chatbotRecord, requestOrigin };
}

widgetRoutes.get("/:widgetId/config", async (c) => {
  const resolved = await resolveWidgetRequest(c, { requireEnabled: true });
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord } = resolved;

  return c.json(buildWidgetConfig(chatbotRecord));
});

widgetRoutes.post("/:widgetId/init", async (c) => {
  const resolved = await resolveWidgetRequest(c);
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord } = resolved;

  const { conversationId } = await c.req.json();

  let messages: any[] = [];
  let conversationStatus: string | null = null;
  let liveChatToken: string | null = null;

  if (conversationId) {
    const [conversation] = await db
      .select({ status: chatConversation.status, metadata: chatConversation.metadata })
      .from(chatConversation)
      .where(eq(chatConversation.id, conversationId))
      .limit(1);

    conversationStatus = conversation?.status ?? null;

    if (conversation?.status === "escalated" || conversation?.status === "assigned") {
      const initialized = await initializeLiveChatConversation({
        conversationId,
      });
      liveChatToken = initialized?.liveChatToken ?? getLiveChatToken(conversation.metadata) ?? null;
    }

    const rows = await db
      .select({
        messageId: chatMessage.messageId,
        role: chatMessage.role,
        contentText: chatMessage.contentText,
        parts: chatMessage.parts,
      })
      .from(chatMessage)
      .where(eq(chatMessage.conversationId, conversationId))
      .orderBy(asc(chatMessage.createdAt));

    messages = convertDbMessagesToUiMessages(rows);
  }

  return c.json({
    config: buildWidgetConfig(chatbotRecord),
    messages,
    conversationStatus,
    liveChatToken,
  });
});

widgetRoutes.post("/:widgetId/chat", widgetChatRateLimitMiddleware, async (c) => {
  const resolved = await resolveWidgetRequest(c, { requireEnabled: true });
  if (resolved instanceof Response) {
    return resolved;
  }

  const { chatbotRecord, requestOrigin } = resolved;
  const channel = resolveConversationChannel(c);

  const { id: conversationId, messages } = await c.req.json();
  const uiMessages = messages;

  if (!Array.isArray(uiMessages)) {
    return c.json({ message: "messages must be an array" }, 400);
  }

  const visitorMetadata = requestOrigin ? getUserMetadataFromRequest(c) : undefined;

  const firstUserMessage = uiMessages.find((m: any) => m.role === "user");
  let title: string | undefined;
  if (firstUserMessage?.parts) {
    const textPart = firstUserMessage.parts.find((p: any) => p?.type === "text");
    title = textPart?.text;
  }

  const targetConversationId = await persistConversationMessages({
    chatbotId: chatbotRecord.id,
    organizationId: chatbotRecord.organizationId,
    userId: undefined,
    channel,
    messages: uiMessages,
    metadata: visitorMetadata,
    title,
    conversationId,
  });

  if (targetConversationId) {
    const status = await getConversationStatus(targetConversationId);
    if (status === "escalated" || status === "assigned" || status === "closed") {
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
  }

  const resolvedConversationId = targetConversationId ?? conversationId;

  const agent = await createSupportChatAgent({
    chatbotId: chatbotRecord.id,
    organizationId: chatbotRecord.organizationId,
    chatbotName: chatbotRecord.name || "AI Assistant",
    chatbotUseCase: chatbotRecord.usecase || "support",
    conversationId: resolvedConversationId,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages,
    originalMessages: uiMessages,
    onFinish: async ({ messages: completedMessages }) => {
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
