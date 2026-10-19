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

type ConversationChannel =
  | "web"
  | "widget"
  | "whatsapp"
  | "discord"
  | "slack"
  | "telegram"
  | "googlechat"
  | "linear"
  | "teams"
  | "instagram"
  | "messenger";

function mergeConversationMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  nextMetadata: Record<string, unknown> | undefined,
) {
  if (!nextMetadata) {
    return currentMetadata ?? undefined;
  }

  return {
    ...currentMetadata,
    ...nextMetadata,
  };
}

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

/** Thrown when a client-supplied conversation id belongs to a different chatbot. */
export class ConversationAccessError extends Error {
  constructor() {
    super("Conversation does not belong to this chatbot");
    this.name = "ConversationAccessError";
  }
}

async function getOrCreateConversation(input: {
  chatbotId: string;
  organizationId: string;
  userId: string | undefined;
  channel?: ConversationChannel;
  title?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
}) {
  if (input.conversationId) {
    const [existing] = await db
      .select({
        id: chatConversation.id,
        metadata: chatConversation.metadata,
        chatbotId: chatConversation.chatbotId,
        organizationId: chatConversation.organizationId,
      })
      .from(chatConversation)
      .where(eq(chatConversation.id, input.conversationId))
      .limit(1);

    if (
      existing &&
      (existing.chatbotId !== input.chatbotId || existing.organizationId !== input.organizationId)
    ) {
      throw new ConversationAccessError();
    }

    if (existing) {
      const nextMetadata = mergeConversationMetadata(existing.metadata, input.metadata);

      if (JSON.stringify(existing.metadata ?? {}) !== JSON.stringify(nextMetadata ?? {})) {
        await db
          .update(chatConversation)
          .set({ metadata: nextMetadata, updatedAt: new Date() })
          .where(eq(chatConversation.id, existing.id));
      }

      return existing.id;
    }

    // Create with the specific ID
    await db.insert(chatConversation).values({
      id: input.conversationId,
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      userId: input.userId ?? undefined,
      channel: input.channel ?? "widget",
      title: input.title || "New Conversation",
      metadata: input.metadata,
    });

    return input.conversationId;
  }

  const existing = await db
    .select({ id: chatConversation.id, metadata: chatConversation.metadata })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.chatbotId, input.chatbotId),
        eq(chatConversation.organizationId, input.organizationId),
        input.userId ? eq(chatConversation.userId, input.userId) : undefined,
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const firstConversation = existing[0];
    if (firstConversation) {
      const nextMetadata = mergeConversationMetadata(firstConversation.metadata, input.metadata);

      if (JSON.stringify(firstConversation.metadata ?? {}) !== JSON.stringify(nextMetadata ?? {})) {
        await db
          .update(chatConversation)
          .set({ metadata: nextMetadata, updatedAt: new Date() })
          .where(eq(chatConversation.id, firstConversation.id));
      }

      return firstConversation.id;
    }
  }

  const inserted = await db
    .insert(chatConversation)
    .values({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
      userId: input.userId ?? undefined,
      channel: input.channel ?? "widget",
      title: input.title || "New Conversation",
      metadata: input.metadata,
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
  userId: string | undefined;
  channel?: ConversationChannel;
  messages: StoredUIMessage[];
  title?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
}): Promise<string | undefined> {
  const normalizedMessages = normalizeIncomingMessages(input.messages);
  if (normalizedMessages.length === 0) {
    return undefined;
  }

  const targetConversationId = await getOrCreateConversation({
    chatbotId: input.chatbotId,
    organizationId: input.organizationId,
    userId: input.userId,
    channel: input.channel,
    title: input.title,
    metadata: input.metadata,
    conversationId: input.conversationId,
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
        eq(chatMessage.conversationId, targetConversationId),
        eq(chatMessage.chatbotId, input.chatbotId),
        eq(chatMessage.organizationId, input.organizationId),
      ),
    );

  const existingByMessageId = new Set(existing.map((row) => row.messageId));
  const existingAssistantProviderItemIds = new Set(
    existing
      .filter((row) => row.role === "assistant")
      .map((row) =>
        extractProviderItemIdFromParts(Array.isArray(row.parts) ? row.parts : undefined),
      )
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
    return targetConversationId;
  }

  await db
    .insert(chatMessage)
    .values(
      toInsert.map((message) => ({
        conversationId: targetConversationId,
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
        userId: input.userId ?? undefined,
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
    .where(eq(chatConversation.id, targetConversationId));

  return targetConversationId;
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

export async function getChatById(input: { id: string }) {
  try {
    const [selectedChat] = await db
      .select()
      .from(chatConversation)
      .where(eq(chatConversation.id, input.id))
      .limit(1);
    return selectedChat;
  } catch (error) {
    console.error("Error fetching chat by ID:", error);
    return null;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.conversationId, id))
      .orderBy(asc(chatMessage.createdAt));
  } catch (error) {
    console.error("Error fetching messages by chat ID:", error);
    return [];
  }
}

export function detectDeviceFromUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  const result: DeviceInfo = {
    type: "unknown",
    os: "unknown",
    browser: "unknown",
    isIOS: false,
    isAndroid: false,
    isMac: false,
    isWindows: false,
    isLinux: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false,
  };

  // Device type detection
  if (
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|tablet|(puffin(?!.*(IP|AP|WP))))/.test(
      ua,
    )
  ) {
    result.type = "tablet";
  } else if (
    /(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds|archos|skyfire|puffin|blazer|bolt|gobrowser|iris|maemo|semc|teashark|uzard)/.test(
      ua,
    )
  ) {
    result.type = "mobile";
  } else {
    result.type = "desktop";
  }

  // OS detection
  if (/iphone|ipad|ipod/.test(ua)) {
    result.os = "iOS";
    result.isIOS = true;
  } else if (/android/.test(ua)) {
    result.os = "Android";
    result.isAndroid = true;
  } else if (/macintosh|mac os x/.test(ua)) {
    result.os = "macOS";
    result.isMac = true;
  } else if (/windows|win32|win64|wow64/.test(ua)) {
    result.os = "Windows";
    result.isWindows = true;
  } else if (/linux/.test(ua) && !result.isAndroid) {
    result.os = "Linux";
    result.isLinux = true;
  }

  // Browser detection
  if (/edg/.test(ua)) {
    result.browser = "Edge";
    result.isEdge = true;
  } else if (/chrome/.test(ua) && !/chromium|edg/.test(ua)) {
    result.browser = "Chrome";
    result.isChrome = true;
  } else if (/firefox/.test(ua)) {
    result.browser = "Firefox";
    result.isFirefox = true;
  } else if (/safari/.test(ua) && !/chrome|chromium|edg/.test(ua)) {
    result.browser = "Safari";
    result.isSafari = true;
  } else if (/msie|trident/.test(ua)) {
    result.browser = "Internet Explorer";
  } else if (/opera/.test(ua)) {
    result.browser = "Opera";
  }

  // Try to detect models for common devices
  if (result.isIOS) {
    const matches =
      ua.match(/iphone\s+os\s+(\d+)_(\d+)/i) || ua.match(/ipad;\s+cpu\s+os\s+(\d+)_(\d+)/i);
    if (matches) {
      const model = ua.includes("ipad") ? "iPad" : "iPhone";
      result.model = `${model} (iOS ${matches[1]}.${matches[2]})`;
    }
  } else if (result.isAndroid) {
    const matches = ua.match(/android\s+(\d+)(\.(\d+))?/i);
    if (matches) {
      result.model = `Android ${matches[1]}${matches[3] ? `.${matches[3]}` : ""}`;
    }
  }

  return result;
}

export async function getConversationStatus(conversationId: string) {
  try {
    const [conversation] = await db
      .select({ status: chatConversation.status })
      .from(chatConversation)
      .where(eq(chatConversation.id, conversationId))
      .limit(1);
    return conversation?.status ?? null;
  } catch {
    return null;
  }
}

export const getUserMetadataFromRequest = (c: any) => {
  const userAgent = c.req.header("user-agent") || "";
  const hostname = new URL(c.req.raw.url).hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const rawCountryCode = c.req.header("cf-ipcountry")?.toUpperCase();
  const country = rawCountryCode && /^[A-Z]{2}$/.test(rawCountryCode) && rawCountryCode !== "XX"
    ? new Intl.DisplayNames(["en"], { type: "region" }).of(rawCountryCode) ?? undefined
    : isLocalhost
      ? "Ghana"
    : undefined;
  const timeZone = c.req.header("x-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = c.req.header("cf-ipcity") || (isLocalhost ? "Accra" : undefined);
  const deviceInfo = detectDeviceFromUserAgent(userAgent);

  return {
    userAgent,
    country,
    timeZone,
    city,
    deviceInfo,
  };
};

export type DeviceInfo = {
  type: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  os: string;
  browser: string;
  model?: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
};
