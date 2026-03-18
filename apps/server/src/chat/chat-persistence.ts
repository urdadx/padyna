import { randomUUID } from "node:crypto";
import { db } from "@padyna/db";
import { chatConversation, chatMessage } from "@padyna/db/schema/index";
import { and, asc, eq } from "drizzle-orm";

type ChatRole = "user" | "assistant" | "system";

type StoredUIMessage = {
  id?: string;
  role: string;
  parts?: unknown;
};

type PersistedMessageRow = {
  messageId: string;
  role: string;
  contentText: string | null;
  parts: unknown[] | null;
};

type NormalizedMessage = {
  messageId: string;
  role: ChatRole;
  parts: unknown[];
  contentText: string;
  providerItemId: string | null;
};

function extractTextFromParts(parts: unknown[] | undefined): string {
  if (!parts || parts.length === 0) {
    return "";
  }

  return parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type !== "text" || typeof candidate.text !== "string") {
        return "";
      }

      return candidate.text;
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractProviderItemIdFromParts(parts: unknown[] | undefined): string | null {
  if (!parts || parts.length === 0) {
    return null;
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    const candidate = part as {
      providerMetadata?: {
        openai?: {
          itemId?: unknown;
        };
      };
      callProviderMetadata?: {
        openai?: {
          itemId?: unknown;
        };
      };
    };

    const fromProviderMetadata = candidate.providerMetadata?.openai?.itemId;
    if (typeof fromProviderMetadata === "string" && fromProviderMetadata.length > 0) {
      return fromProviderMetadata;
    }

    const fromCallProviderMetadata = candidate.callProviderMetadata?.openai?.itemId;
    if (typeof fromCallProviderMetadata === "string" && fromCallProviderMetadata.length > 0) {
      return fromCallProviderMetadata;
    }
  }

  return null;
}

function isChatRole(role: string): role is ChatRole {
  return role === "user" || role === "assistant" || role === "system";
}

function normalizeIncomingMessages(messages: StoredUIMessage[]) {
  return messages
    .map((message) => {
      if (!isChatRole(message.role)) {
        return null;
      }

      const parts = Array.isArray(message.parts) ? message.parts : [];
      const providerItemId = extractProviderItemIdFromParts(parts);
      const rawMessageId = typeof message.id === "string" ? message.id.trim() : "";

      return {
        messageId: providerItemId || rawMessageId || randomUUID(),
        role: message.role,
        parts,
        contentText: extractTextFromParts(parts),
        providerItemId,
      };
    })
    .filter((message): message is NormalizedMessage => message !== null);
}

async function getOrCreateConversation(input: {
  chatbotId: string;
  organizationId: string;
  userId: string;
}) {
  const existing = await db
    .select({ id: chatConversation.id })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.chatbotId, input.chatbotId),
        eq(chatConversation.organizationId, input.organizationId),
        eq(chatConversation.userId, input.userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const firstConversation = existing[0];
    if (firstConversation) {
      return firstConversation.id;
    }
  }

  const inserted = await db
    .insert(chatConversation)
    .values({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      userId: input.userId,
    })
    .returning({ id: chatConversation.id });

  const firstInsertedConversation = inserted[0];
  if (!firstInsertedConversation) {
    throw new Error("Failed to create chat conversation.");
  }

  return firstInsertedConversation.id;
}

export async function loadConversationMessages(input: {
  chatbotId: string;
  organizationId: string;
  userId: string;
}) {
  const conversationRows = await db
    .select({ id: chatConversation.id })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.chatbotId, input.chatbotId),
        eq(chatConversation.organizationId, input.organizationId),
        eq(chatConversation.userId, input.userId),
      ),
    )
    .limit(1);

  if (conversationRows.length === 0) {
    return [];
  }

  const firstConversation = conversationRows[0];
  if (!firstConversation) {
    return [];
  }

  const rows = await db
    .select({
      messageId: chatMessage.messageId,
      role: chatMessage.role,
      contentText: chatMessage.contentText,
      parts: chatMessage.parts,
    })
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.conversationId, firstConversation.id),
        eq(chatMessage.chatbotId, input.chatbotId),
        eq(chatMessage.organizationId, input.organizationId),
        eq(chatMessage.userId, input.userId),
      ),
    )
    .orderBy(asc(chatMessage.createdAt));

  return rows.map((row: PersistedMessageRow) => ({
    id: row.messageId,
    role: row.role,
    parts: Array.isArray(row.parts) ? row.parts : [],
  }));
}

export async function persistConversationMessages(input: {
  chatbotId: string;
  organizationId: string;
  userId: string;
  messages: StoredUIMessage[];
}) {
  const normalizedMessages = normalizeIncomingMessages(input.messages);
  if (normalizedMessages.length === 0) {
    return;
  }

  const conversationId = await getOrCreateConversation({
    chatbotId: input.chatbotId,
    organizationId: input.organizationId,
    userId: input.userId,
  });

  const existing = await db
    .select({
      messageId: chatMessage.messageId,
      role: chatMessage.role,
      parts: chatMessage.parts,
    })
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.conversationId, conversationId),
        eq(chatMessage.chatbotId, input.chatbotId),
        eq(chatMessage.organizationId, input.organizationId),
        eq(chatMessage.userId, input.userId),
      ),
    );

  const existingByMessageId = new Set(existing.map((row) => row.messageId));
  const existingAssistantProviderItemIds = new Set(
    existing
      .filter((row) => row.role === "assistant")
      .map((row) => extractProviderItemIdFromParts(Array.isArray(row.parts) ? row.parts : undefined))
      .filter((itemId): itemId is string => itemId !== null),
  );

  const toInsert = normalizedMessages.filter((message) => {
    if (existingByMessageId.has(message.messageId)) {
      return false;
    }

    if (
      message.role === "assistant" &&
      message.providerItemId !== null &&
      existingAssistantProviderItemIds.has(message.providerItemId)
    ) {
        return false;
    }

    return true;
  });

  if (toInsert.length === 0) {
    return;
  }

  await db
    .insert(chatMessage)
    .values(
      toInsert.map((message) => ({
        conversationId,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
        userId: input.userId,
        role: message.role,
        messageId: message.messageId,
        contentText: message.contentText,
        parts: message.parts,
      })),
    )
    .onConflictDoNothing();

  await db
    .update(chatConversation)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversation.id, conversationId));
}

export async function clearConversationMessages(input: {
  chatbotId: string;
  organizationId: string;
  userId: string;
}) {
  await db
    .delete(chatConversation)
    .where(
      and(
        eq(chatConversation.chatbotId, input.chatbotId),
        eq(chatConversation.organizationId, input.organizationId),
        eq(chatConversation.userId, input.userId),
      ),
    );
}
