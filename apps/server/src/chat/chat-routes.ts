import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth-middleware";
import { createSupportChatAgent } from "./agents";
import { getLatestUserText, prefetchKnowledge, streamAgentResponse } from "./knowledge-first-stream";
import {
  getConversationStatus,
  getUserMetadataFromRequest,
  loadConversationMessages,
  persistConversationMessages,
} from "./chat-utils";
import { db } from "@padyna/db";
import { chatbot, organization } from "@padyna/db/schema/index";
import { eq, and } from "drizzle-orm";
import { broadcastConversationStatusUpdate } from "./live-chat-service";
import { createRateLimitMiddleware } from "../lib/ratelimiter";
import { polarClient } from "@padyna/auth/lib/payments";

type Variables = {
  user: any;
  session: any;
};

export const chatRoutes = new Hono<{ Variables: Variables }>();

const AUTH_CHAT_RATE_LIMIT_MAX_REQUESTS = 30;
const AUTH_CHAT_RATE_LIMIT_WINDOW_SECONDS = 60;

const authChatRateLimitMiddleware = createRateLimitMiddleware({
  namespace: "chat-auth-generation",
  maxRequests: AUTH_CHAT_RATE_LIMIT_MAX_REQUESTS,
  windowSeconds: AUTH_CHAT_RATE_LIMIT_WINDOW_SECONDS,
  resolveIdentifier: (c) => {
    const session = c.get("session") as Variables["session"];
    const user = c.get("user") as Variables["user"];

    const userId = user?.id;
    const activeOrganization = session?.activeOrganization;
    const activeChatbot = session?.activeChatbot;

    if (!userId || !activeOrganization || !activeChatbot) {
      return null;
    }

    return `${userId}:${activeOrganization}:${activeChatbot}`;
  },
});

chatRoutes.use(authMiddleware);

chatRoutes.post("/", authChatRateLimitMiddleware, async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return c.json({ message: "No active chatbot or organization" }, 400);
  }

  const user = c.get("user");
  const userId = user?.id;

  if (!userId) {
    return c.json({ message: "No active user" }, 400);
  }

  const body = await c.req.json();
  const uiMessages = body.messages;
  const conversationId = body.conversationId;

  if (!Array.isArray(uiMessages)) {
    return c.json({ message: "messages must be an array" }, 400);
  }

  // Start the knowledge search right away; it overlaps with the lookups below and
  // lets the model answer without a separate search step.
  const prefetchPromise = prefetchKnowledge({
    query: getLatestUserText(uiMessages),
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
  });

  const [[chatbotData], [organizationData]] = await Promise.all([
    db
      .select()
      .from(chatbot)
      .where(and(eq(chatbot.id, activeChatbot), eq(chatbot.organizationId, activeOrganization)))
      .limit(1),
    db
      .select({ externalCustomerId: organization.externalCustomerId })
      .from(organization)
      .where(eq(organization.id, activeOrganization))
      .limit(1),
  ]);

  if (!chatbotData) {
    return c.json({ message: "Chatbot not found" }, 404);
  }

  const chatbotName = chatbotData.name || "AI Assistant";
  const chatbotUseCase = chatbotData.usecase || "support";
  const externalCustomerId = organizationData?.externalCustomerId;

  const firstMessage = uiMessages[0];
  const firstTextPart = firstMessage?.parts?.find(
    (part: any) => part?.type === "text" && typeof part?.text === "string",
  );
  const title = firstTextPart?.text || "New Conversation";

  const targetConversationId = await persistConversationMessages({
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
    userId,
    channel: "web",
    metadata: getUserMetadataFromRequest(c),
    messages: uiMessages,
    title,
    conversationId,
  });

  const resolvedConversationId = targetConversationId ?? conversationId;

  const [status, agent, prefetched] = await Promise.all([
    targetConversationId ? getConversationStatus(targetConversationId) : null,
    createSupportChatAgent({
      chatbotId: activeChatbot,
      organizationId: activeOrganization,
      chatbotName,
      chatbotUseCase,
      conversationId: resolvedConversationId,
      userId,
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
    onUsage: async (usage) => {
      if (!externalCustomerId) {
        return;
      }

      await polarClient.events.ingest({
        events: [
          {
            name: "llm_usage",
            externalCustomerId,
            metadata: {
              totalTokens: usage.totalTokens ?? 0,
              promptTokens: usage.inputTokens ?? 0,
              completionTokens: usage.outputTokens ?? 0,
            },
          },
        ],
      });
    },
    onFinish: async (messages) => {
      await persistConversationMessages({
        chatbotId: activeChatbot,
        organizationId: activeOrganization,
        userId,
        channel: "web",
        metadata: getUserMetadataFromRequest(c),
        messages,
        conversationId: resolvedConversationId,
      });
    },
  });
});

chatRoutes.get("/history", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;
  const userId = user?.id;

  if (!activeChatbot || !activeOrganization || !userId) {
    return c.json({ message: "No active chatbot, organization, or user" }, 400);
  }

  const messages = await loadConversationMessages({
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
    userId,
  });

  return c.json({ messages });
});
