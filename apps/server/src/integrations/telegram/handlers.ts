import { randomUUID } from "node:crypto";
import { db } from "@padyna/db";
import { chatConversation, chatMessage } from "@padyna/db/schema/index";
import { chatbot } from "@padyna/db/schema/chatbot";
import type { TelegramMessage } from "@chat-adapter/telegram";
import { and, desc, eq, sql } from "drizzle-orm";
import { createSupportChatAgent } from "../../chat";

declare global {
  var __padynaTelegramHandlersRegistered: boolean | undefined;
}

type TelegramThreadState = {
  chatbotId: string;
  conversationId: string;
  organizationId: string;
  telegramChatId: string;
  telegramUserId?: string | null;
};

type ConversationRecord = {
  id: string;
  chatbotId: string;
  organizationId: string;
  title: string;
};

const TELEGRAM_DEFAULT_TITLE = "Telegram conversation";

function getTelegramRawMessage(message: any) {
  return (message.raw ?? {}) as TelegramMessage;
}

function getTelegramText(message: any) {
  const rawMessage = getTelegramRawMessage(message);

  if (typeof message.text === "string" && message.text.trim().length > 0) {
    return message.text.trim();
  }

  if (typeof rawMessage.text === "string" && rawMessage.text.trim().length > 0) {
    return rawMessage.text.trim();
  }

  if (typeof rawMessage.caption === "string" && rawMessage.caption.trim().length > 0) {
    return rawMessage.caption.trim();
  }

  return "";
}

function getMessageId(message: any) {
  const rawMessage = getTelegramRawMessage(message);

  if (typeof message.id === "string" && message.id.length > 0) {
    return message.id;
  }

  if (typeof rawMessage.message_id === "number") {
    return rawMessage.message_id.toString();
  }

  return randomUUID();
}

async function findConversationById(conversationId: string) {
  const [conversation] = await db
    .select({
      id: chatConversation.id,
      chatbotId: chatConversation.chatbotId,
      organizationId: chatConversation.organizationId,
      title: chatConversation.title,
    })
    .from(chatConversation)
    .where(eq(chatConversation.id, conversationId))
    .limit(1);

  return conversation ?? null;
}

async function findConversationByChatAndChatbot(telegramChatId: string, chatbotId: string) {
  const [conversation] = await db
    .select({
      id: chatConversation.id,
      chatbotId: chatConversation.chatbotId,
      organizationId: chatConversation.organizationId,
      title: chatConversation.title,
    })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.channel, "telegram"),
        eq(chatConversation.chatbotId, chatbotId),
        sql`${chatConversation.metadata}->>'telegramChatId' = ${telegramChatId}`,
      ),
    )
    .limit(1);

  return conversation ?? null;
}

async function findLatestConversationByChat(telegramChatId: string) {
  const [conversation] = await db
    .select({
      id: chatConversation.id,
      chatbotId: chatConversation.chatbotId,
      organizationId: chatConversation.organizationId,
      title: chatConversation.title,
    })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.channel, "telegram"),
        sql`${chatConversation.metadata}->>'telegramChatId' = ${telegramChatId}`,
      ),
    )
    .orderBy(desc(chatConversation.createdAt))
    .limit(1);

  return conversation ?? null;
}

async function persistTelegramMessage(args: {
  conversation: ConversationRecord;
  role: "user" | "assistant";
  messageId: string;
  contentText: string;
}) {
  await db
    .insert(chatMessage)
    .values({
      conversationId: args.conversation.id,
      chatbotId: args.conversation.chatbotId,
      organizationId: args.conversation.organizationId,
      role: args.role,
      messageId: args.messageId,
      contentText: args.contentText,
      parts: [{ type: "text", text: args.contentText }],
    })
    .onConflictDoNothing();
}

async function updateConversationTitleFromMessage(
  conversation: ConversationRecord,
  contentText: string,
) {
  const nextTitle = contentText.trim();

  if (!nextTitle || conversation.title !== TELEGRAM_DEFAULT_TITLE) {
    return;
  }

  await db
    .update(chatConversation)
    .set({
      title: nextTitle,
      updatedAt: new Date(),
    })
    .where(eq(chatConversation.id, conversation.id));

  conversation.title = nextTitle;
}

async function resolveActiveConversation(thread: any, message: any) {
  const rawMessage = getTelegramRawMessage(message);
  const telegramChatId = rawMessage.chat?.id?.toString();
  const telegramUserId = rawMessage.from?.id?.toString() ?? null;

  if (!telegramChatId) {
    return null;
  }

  const currentState = (await thread.state) as TelegramThreadState | null;
  if (currentState?.conversationId) {
    const existingConversation = await findConversationById(currentState.conversationId);
    if (existingConversation) {
      return existingConversation;
    }
  }

  const conversation = await findLatestConversationByChat(telegramChatId);
  if (!conversation) {
    return null;
  }

  await thread.setState({
    chatbotId: conversation.chatbotId,
    conversationId: conversation.id,
    organizationId: conversation.organizationId,
    telegramChatId,
    telegramUserId,
  } satisfies TelegramThreadState);

  return conversation;
}

async function runAgentAndRespond(args: {
  thread: any;
  message: any;
  conversation: ConversationRecord;
}) {
  const prompt = getTelegramText(args.message);
  if (!prompt) {
    await args.thread.post("I can only respond to text messages right now.");
    return;
  }

  const chatbotRecord = await db.query.chatbot.findFirst({
    columns: {
      id: true,
      name: true,
      organizationId: true,
      usecase: true,
    },
    where: eq(chatbot.id, args.conversation.chatbotId),
  });

  if (!chatbotRecord || chatbotRecord.organizationId !== args.conversation.organizationId) {
    await args.thread.post("This Telegram connection points to a chatbot that no longer exists.");
    return;
  }

  try {
    await args.thread.startTyping();

    const agent = await createSupportChatAgent({
      chatbotId: args.conversation.chatbotId,
      organizationId: args.conversation.organizationId,
      chatbotName: chatbotRecord.name || "AI Assistant",
      chatbotUseCase: chatbotRecord.usecase || "support",
      conversationId: args.conversation.id,
      allowEscalation: false,
    });

    const response = await agent.generate({ prompt });
    const responseText = response.text?.trim() || "Sorry, I couldn't generate a response.";

    await persistTelegramMessage({
      conversation: args.conversation,
      role: "assistant",
      messageId: randomUUID(),
      contentText: responseText,
    });

    await args.thread.post(responseText);
  } catch (error) {
    console.error("Failed to process Telegram message", error);
    await args.thread.post("Something went wrong while generating a response. Please try again.");
  }
}

async function handleStartCommand(thread: any, message: any, text: string) {
  const rawMessage = getTelegramRawMessage(message);
  const telegramChatId = rawMessage.chat?.id?.toString();
  const telegramUserId = rawMessage.from?.id?.toString() ?? null;
  const chatbotId = text.replace(/^\/start\s*/u, "").trim();

  if (!telegramChatId) {
    await thread.post("I couldn't determine which Telegram chat this message came from.");
    return;
  }

  if (!chatbotId) {
    await thread.post("Hi! To get started, use the Telegram link provided by the business.");
    return;
  }

  const chatbotRecord = await db.query.chatbot.findFirst({
    columns: {
      id: true,
      initialMessage: true,
      name: true,
      organizationId: true,
    },
    where: eq(chatbot.id, chatbotId),
  });

  if (!chatbotRecord) {
    await thread.post("This link is invalid or the chatbot no longer exists.");
    return;
  }

  const existingConversation = await findConversationByChatAndChatbot(
    telegramChatId,
    chatbotRecord.id,
  );

  const conversation =
    existingConversation ??
    (await db
      .insert(chatConversation)
      .values({
        chatbotId: chatbotRecord.id,
        organizationId: chatbotRecord.organizationId,
        channel: "telegram",
        title: TELEGRAM_DEFAULT_TITLE,
        metadata: {
          chatbotId: chatbotRecord.id,
          telegramChatId,
          telegramUserId,
        },
      })
      .returning({
        id: chatConversation.id,
        chatbotId: chatConversation.chatbotId,
        organizationId: chatConversation.organizationId,
        title: chatConversation.title,
      })
      .then((rows) => rows[0] ?? null));

  if (!conversation) {
    await thread.post(
      "I couldn't start a Telegram conversation for this chatbot. Please try again.",
    );
    return;
  }

  await thread.setState({
    chatbotId: conversation.chatbotId,
    conversationId: conversation.id,
    organizationId: conversation.organizationId,
    telegramChatId,
    telegramUserId,
  } satisfies TelegramThreadState);

  await thread.subscribe();
  await thread.post(chatbotRecord.initialMessage || "Hi! How can I help you today?");
}

async function handleTelegramMessage(thread: any, message: any) {
  const text = getTelegramText(message);

  if (text.startsWith("/start")) {
    await handleStartCommand(thread, message, text);
    return;
  }

  const conversation = await resolveActiveConversation(thread, message);
  if (!conversation) {
    await thread.post("Please use the Telegram link provided by the business to get started.");
    return;
  }

  const contentText = getTelegramText(message);
  if (!contentText) {
    await thread.post("I can only respond to text messages right now.");
    return;
  }

  await persistTelegramMessage({
    conversation,
    role: "user",
    messageId: getMessageId(message),
    contentText,
  });

  await updateConversationTitleFromMessage(conversation, contentText);

  await runAgentAndRespond({
    thread,
    message,
    conversation,
  });
}

export function registerTelegramHandlers(telegramBot: any) {
  if (globalThis.__padynaTelegramHandlersRegistered) {
    return;
  }

  telegramBot.onNewMention(async (thread: any, message: any) => {
    await handleTelegramMessage(thread, message);
  });

  telegramBot.onSubscribedMessage(async (thread: any, message: any) => {
    await handleTelegramMessage(thread, message);
  });

  globalThis.__padynaTelegramHandlersRegistered = true;
}
