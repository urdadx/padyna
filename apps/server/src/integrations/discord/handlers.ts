import { randomUUID } from "node:crypto";
import { db } from "@padyna/db";
import { chatConversation, chatMessage, discordConnection } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import { createSupportChatAgent } from "../../chat";
import { liveChatService } from "../../chat/live-chat-service";

declare global {
  var __padynaDiscordHandlersRegistered: boolean | undefined;
}

type DiscordConnectionRecord = typeof discordConnection.$inferSelect;

type DiscordRawMessage = {
  id?: string;
  type?: number;
  guild_id?: string;
  channel_id?: string;
  author?: {
    id?: string;
    username?: string;
    global_name?: string;
  };
  member?: {
    nick?: string;
  };
  referenced_message?: {
    guild_id?: string;
    channel_id?: string;
    author?: {
      id?: string;
      username?: string;
      global_name?: string;
    };
    member?: {
      nick?: string;
    };
  };
};

type DiscordConversationMetadata = {
  guildId?: string | null;
  channelId?: string | null;
  threadId?: string | null;
  discordUserId?: string | null;
  participantName?: string | null;
  participantHandle?: string | null;
  sourceLabel?: string | null;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getDiscordConversationMetadata(threadId: string, message: any): DiscordConversationMetadata {
  const rawMessage = getDiscordRawMessage(message);
  const sourceMessage = rawMessage.referenced_message ?? rawMessage;
  const userName =
    getTrimmedString(message.author?.userName) ?? getTrimmedString(sourceMessage.author?.username);
  const participantName =
    getTrimmedString(message.author?.fullName) ??
    getTrimmedString(sourceMessage.member?.nick) ??
    getTrimmedString(sourceMessage.author?.global_name) ??
    userName;

  return {
    guildId: sourceMessage.guild_id ?? rawMessage.guild_id ?? null,
    channelId: sourceMessage.channel_id ?? rawMessage.channel_id ?? null,
    threadId,
    discordUserId: sourceMessage.author?.id ?? rawMessage.author?.id ?? null,
    participantName,
    participantHandle: userName ? `@${userName}` : null,
    sourceLabel: (sourceMessage.guild_id ?? rawMessage.guild_id)
      ? "Discord server thread"
      : "Discord direct message",
  };
}

async function updateConversationMetadata(conversationId: string, metadata: DiscordConversationMetadata) {
  const [conversation] = await db
    .select({ metadata: chatConversation.metadata })
    .from(chatConversation)
    .where(eq(chatConversation.id, conversationId))
    .limit(1);

  if (!conversation) {
    return;
  }

  const nextMetadata = {
    ...conversation.metadata,
    ...metadata,
  };

  if (JSON.stringify(conversation.metadata ?? {}) === JSON.stringify(nextMetadata)) {
    return;
  }

  await db
    .update(chatConversation)
    .set({ metadata: nextMetadata, updatedAt: new Date() })
    .where(eq(chatConversation.id, conversationId));
}

function getDiscordRawMessage(message: any) {
  return (message.raw ?? {}) as DiscordRawMessage;
}

function getDiscordConversationTitle(message: any) {
  const title =
    typeof message.text === "string"
      ? message.text
          .trim()
          .replace(/^(?:<@!?\d+>|@[A-Za-z0-9_.-]+)(?:[\s,:-]+)?/, "")
          .trim()
      : "";

  return title || "Discord conversation";
}

async function getChatbotRecord(connection: DiscordConnectionRecord) {
  const chatbots = await db.query.chatbot.findMany({
    columns: {
      id: true,
      name: true,
      usecase: true,
      organizationId: true,
    },
  });

  return (
    chatbots.find(
      (record) =>
        record.id === connection.chatbotId && record.organizationId === connection.organizationId,
    ) ?? null
  );
}

async function persistDiscordMessage(args: {
  conversationId: string;
  connection: DiscordConnectionRecord;
  role: "user" | "assistant";
  messageId: string;
  contentText: string;
}) {
  await db
    .insert(chatMessage)
    .values({
      conversationId: args.conversationId,
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      role: args.role,
      messageId: args.messageId,
      contentText: args.contentText,
      parts: [{ type: "text", text: args.contentText }],
    })
    .onConflictDoNothing();

  return {
    id: args.messageId,
    role: args.role,
    text: args.contentText,
    createdAt: new Date().toISOString(),
  };
}

async function findConversationByThreadId(threadId: string, connection: DiscordConnectionRecord) {
  const conversations = await db.query.chatConversation.findMany({
    columns: {
      id: true,
      chatbotId: true,
      organizationId: true,
      channel: true,
      status: true,
      metadata: true,
    },
  });

  return (
    conversations.find((conversation) => {
      if (
        conversation.channel !== "discord" ||
        conversation.chatbotId !== connection.chatbotId ||
        conversation.organizationId !== connection.organizationId
      ) {
        return false;
      }

      const metadata = (conversation.metadata ?? {}) as DiscordConversationMetadata;
      return metadata.threadId === threadId;
    }) ?? null
  );
}

async function createConversationForMention(args: {
  threadId: string;
  message: any;
  connection: DiscordConnectionRecord;
}) {
  const [conversation] = await db
    .insert(chatConversation)
    .values({
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      channel: "discord",
      title: getDiscordConversationTitle(args.message),
      metadata: getDiscordConversationMetadata(args.threadId, args.message),
    })
    .returning({ id: chatConversation.id });

  return conversation ?? null;
}

function isConversationInHumanHandoff(status: string | null | undefined) {
  return status === "escalated" || status === "assigned";
}

async function runAgentAndRespond(args: {
  thread: any;
  message: any;
  connection: DiscordConnectionRecord;
  conversationId: string;
}) {
  const prompt = args.message.text?.trim();
  if (!prompt) {
    await args.thread.post("I can only respond to text messages right now.");
    return;
  }

  const chatbotRecord = await getChatbotRecord(args.connection);
  if (!chatbotRecord) {
    await args.thread.post("This Discord connection points to a chatbot that no longer exists.");
    return;
  }

  try {
    await args.thread.startTyping();

    const agent = await createSupportChatAgent({
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      chatbotName: chatbotRecord.name || "AI Assistant",
      chatbotUseCase: chatbotRecord.usecase || "support",
      conversationId: args.conversationId,
      allowEscalation: false,
    });

    const response = await agent.generate({ prompt });
    const responseText = response.text?.trim() || "Sorry, I couldn't generate a response.";

    await persistDiscordMessage({
      conversationId: args.conversationId,
      connection: args.connection,
      role: "assistant",
      messageId: randomUUID(),
      contentText: responseText,
    });

    await args.thread.post(responseText);
  } catch (error) {
    console.error("Failed to process Discord message", error);
    await args.thread.post("Something went wrong while generating a response. Please try again.");
  }
}

export function registerDiscordHandlers(discordBot: any) {
  if (globalThis.__padynaDiscordHandlersRegistered) {
    return;
  }

  discordBot.onNewMention(async (thread: any, message: any) => {
    const rawMessage = getDiscordRawMessage(message);
    const guildId = rawMessage.guild_id;

    if (!guildId) {
      await thread.post(
        "Discord direct messages are not supported yet. Connect the bot to a server first.",
      );
      return;
    }

    const connections = await db.query.discordConnection.findMany();
    const connection = connections.find((record) => record.guildId === guildId) ?? null;

    if (!connection) {
      await thread.post("This server is not connected to a Padyna chatbot yet.");
      return;
    }

    const existingConversation = await findConversationByThreadId(thread.id, connection);
    const conversation =
      existingConversation ??
      (await createConversationForMention({
        threadId: thread.id,
        message,
        connection,
      }));

    if (!conversation) {
      await thread.post("I couldn't start a conversation for this server. Please try again.");
      return;
    }

    await updateConversationMetadata(conversation.id, getDiscordConversationMetadata(thread.id, message));

    await thread.subscribe();

    const persisted = await persistDiscordMessage({
      conversationId: conversation.id,
      connection,
      role: "user",
      messageId: typeof message.id === "string" ? message.id : rawMessage.id || randomUUID(),
      contentText: message.text || "",
    });

    if (isConversationInHumanHandoff((conversation as { status?: string | null }).status)) {
      liveChatService.broadcastExternalMessage({
        conversationId: conversation.id,
        message: persisted,
      });
      return;
    }

    await runAgentAndRespond({
      thread,
      message,
      connection,
      conversationId: conversation.id,
    });
  });

  discordBot.onSubscribedMessage(async (thread: any, message: any) => {
    const rawMessage = getDiscordRawMessage(message);
    const guildId = rawMessage.guild_id;

    if (!guildId) {
      return;
    }

    const connections = await db.query.discordConnection.findMany();
    const connection = connections.find((record) => record.guildId === guildId) ?? null;

    if (!connection) {
      return;
    }

    const conversation = await findConversationByThreadId(thread.id, connection);
    if (!conversation) {
      return;
    }

    await updateConversationMetadata(conversation.id, getDiscordConversationMetadata(thread.id, message));

    const persisted = await persistDiscordMessage({
      conversationId: conversation.id,
      connection,
      role: "user",
      messageId: typeof message.id === "string" ? message.id : rawMessage.id || randomUUID(),
      contentText: message.text || "",
    });

    if (isConversationInHumanHandoff(conversation.status)) {
      liveChatService.broadcastExternalMessage({
        conversationId: conversation.id,
        message: persisted,
      });
      return;
    }

    await runAgentAndRespond({
      thread,
      message,
      connection,
      conversationId: conversation.id,
    });
  });

  globalThis.__padynaDiscordHandlersRegistered = true;
}
