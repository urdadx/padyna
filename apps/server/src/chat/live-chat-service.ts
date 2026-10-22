import { randomUUID } from "node:crypto";
import { auth } from "@padyna/auth";
import { db } from "@padyna/db";
import { createOrganizationNotification } from "@padyna/db/notifications";
import { chatConversation, chatMessage } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import {
  createLiveChatHub,
  getLiveChatToken,
  type ConversationStatus,
  type LiveChatStore,
} from "./live-chat-hub";

const NOTIFICATION_TITLES = {
  "conversation.agent_joined": "Agent joined conversation",
  "conversation.human_joined": "Visitor joined conversation",
} as const;

const store: LiveChatStore = {
  async getConversation(conversationId) {
    const [conversation] = await db
      .select({
        id: chatConversation.id,
        chatbotId: chatConversation.chatbotId,
        organizationId: chatConversation.organizationId,
        status: chatConversation.status,
        assignedTo: chatConversation.assignedTo,
        metadata: chatConversation.metadata,
      })
      .from(chatConversation)
      .where(eq(chatConversation.id, conversationId))
      .limit(1);

    if (!conversation) {
      return null;
    }

    return {
      ...conversation,
      assignedTo: conversation.assignedTo ?? null,
      metadata: (conversation.metadata ?? null) as Record<string, unknown> | null,
    };
  },

  async authenticateAgent(headers, conversation) {
    const session = await auth.api.getSession({ headers });

    if (!session?.session || !session.user) {
      return { ok: false, code: "UNAUTHORIZED", message: "Agent session is required." };
    }

    if (
      session.session.activeOrganization !== conversation.organizationId ||
      session.session.activeChatbot !== conversation.chatbotId
    ) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to this conversation.",
      };
    }

    const userName =
      typeof session.user.name === "string" && session.user.name.trim().length > 0
        ? session.user.name.trim()
        : "Human Agent";

    return { ok: true, userId: session.user.id, userName };
  },

  async saveMessage({ conversation, role, text, userId }) {
    const messageId = randomUUID();
    const createdAt = new Date();

    // One round trip: the insert and the conversation's updatedAt bump run together.
    await Promise.all([
      db.insert(chatMessage).values({
        conversationId: conversation.id,
        chatbotId: conversation.chatbotId,
        organizationId: conversation.organizationId,
        userId: userId ?? undefined,
        role,
        messageId,
        contentText: text,
        parts: [{ type: "text", text }],
        createdAt,
      }),
      db
        .update(chatConversation)
        .set({ updatedAt: createdAt })
        .where(eq(chatConversation.id, conversation.id)),
    ]);

    return { id: messageId, createdAt: createdAt.toISOString() };
  },

  async assignAgent(conversationId, userId) {
    await db
      .update(chatConversation)
      .set({ status: "assigned", assignedTo: userId, updatedAt: new Date() })
      .where(eq(chatConversation.id, conversationId));
  },

  async notify({ conversation, eventType, actorUserId, name }) {
    const isAgent = eventType === "conversation.agent_joined";
    await createOrganizationNotification({
      organizationId: conversation.organizationId,
      chatbotId: conversation.chatbotId,
      actorUserId,
      eventType,
      entityType: "conversation",
      entityId: conversation.id,
      title: NOTIFICATION_TITLES[eventType],
      body: name,
      metadata: isAgent
        ? { conversationId: conversation.id, agentUserId: actorUserId, agentName: name }
        : { conversationId: conversation.id, visitorName: name },
      dedupeKey: isAgent
        ? `${eventType}:${conversation.id}:${actorUserId}`
        : `${eventType}:${conversation.id}`,
    });
  },
};

export const liveChatService = createLiveChatHub(store);

export function generateLiveChatToken(): string {
  return randomUUID();
}

export async function initializeLiveChatConversation(input: {
  conversationId: string;
  status?: "escalated" | "assigned";
  reason?: string;
  summary?: string;
}) {
  const [existingConversation] = await db
    .select({
      id: chatConversation.id,
      metadata: chatConversation.metadata,
    })
    .from(chatConversation)
    .where(eq(chatConversation.id, input.conversationId))
    .limit(1);

  if (!existingConversation) {
    return null;
  }

  const currentMetadata =
    (existingConversation.metadata as Record<string, unknown> | null | undefined) ?? {};
  const existingToken = getLiveChatToken(currentMetadata);

  if (
    existingToken &&
    input.reason === undefined &&
    input.summary === undefined &&
    input.status === undefined
  ) {
    return {
      id: existingConversation.id,
      status: null,
      liveChatToken: existingToken,
      metadata: currentMetadata,
    };
  }

  const liveChatToken = existingToken ?? generateLiveChatToken();

  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    escalationReason: input.reason ?? currentMetadata.escalationReason,
    escalationSummary: input.summary ?? currentMetadata.escalationSummary,
    escalatedAt:
      typeof currentMetadata.escalatedAt === "string"
        ? currentMetadata.escalatedAt
        : new Date().toISOString(),
    liveChatToken,
    liveChatInitializedAt: new Date().toISOString(),
    liveChatPhase: "waiting_for_join",
  };

  const [updated] = await db
    .update(chatConversation)
    .set({
      status: input.status ?? "escalated",
      metadata: nextMetadata,
      updatedAt: new Date(),
    })
    .where(eq(chatConversation.id, input.conversationId))
    .returning({
      id: chatConversation.id,
      metadata: chatConversation.metadata,
      status: chatConversation.status,
    });

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    status: updated.status,
    liveChatToken,
    metadata: (updated.metadata ?? {}) as Record<string, unknown>,
  };
}

export function broadcastConversationStatusUpdate(input: {
  conversationId: string;
  status: ConversationStatus;
}) {
  liveChatService.broadcastConversationStatus(input);
}

export async function getConversationByChatbotAndOrganization(input: {
  chatbotId: string;
  organizationId: string;
  userId?: string;
}) {
  const clauses = [
    eq(chatConversation.chatbotId, input.chatbotId),
    eq(chatConversation.organizationId, input.organizationId),
  ];

  if (input.userId) {
    clauses.push(eq(chatConversation.userId, input.userId));
  }

  const [conversation] = await db
    .select({
      id: chatConversation.id,
      userId: chatConversation.userId,
      status: chatConversation.status,
    })
    .from(chatConversation)
    .where(and(...clauses))
    .limit(1);

  return conversation ?? null;
}
