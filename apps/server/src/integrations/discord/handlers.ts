import { randomUUID } from "node:crypto";
import { db } from "@padyna/db";
import {
  chatConversation,
  chatMessage,
  discordConnection,
} from "@padyna/db/schema/index";
import { createSupportChatAgent } from "../../chat";

declare global {
  var __padynaDiscordHandlersRegistered: boolean | undefined;
}

type DiscordConnectionRecord = typeof discordConnection.$inferSelect;

type DiscordRawMessage = {
  id?: string;
  guild_id?: string;
  channel_id?: string;
  author?: {
    id?: string;
  };
};

type DiscordConversationMetadata = {
  guildId?: string | null;
  channelId?: string | null;
  threadId?: string | null;
  discordUserId?: string | null;
};

function getDiscordRawMessage(message: any) {
  return (message.raw ?? {}) as DiscordRawMessage;
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
}

async function findConversationByThreadId(threadId: string, connection: DiscordConnectionRecord) {
  const conversations = await db.query.chatConversation.findMany({
    columns: {
      id: true,
      chatbotId: true,
      organizationId: true,
      channel: true,
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
  const rawMessage = getDiscordRawMessage(args.message);

  const [conversation] = await db
    .insert(chatConversation)
    .values({
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      channel: "discord",
      title: args.message.text?.trim() || "Discord conversation",
      metadata: {
        guildId: rawMessage.guild_id ?? null,
        channelId: rawMessage.channel_id ?? null,
        threadId: args.threadId,
        discordUserId: rawMessage.author?.id ?? null,
      },
    })
    .returning({ id: chatConversation.id });

  return conversation ?? null;
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

    const agent = createSupportChatAgent({
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
      await thread.post("Discord direct messages are not supported yet. Connect the bot to a server first.");
      return;
    }

    const connections = await db.query.discordConnection.findMany();
    const connection = connections.find((record) => record.guildId === guildId) ?? null;

    if (!connection) {
      await thread.post("This server is not connected to a Padyna chatbot yet.");
      return;
    }

    const conversation = await createConversationForMention({
      threadId: thread.id,
      message,
      connection,
    });

    if (!conversation) {
      await thread.post("I couldn't start a conversation for this server. Please try again.");
      return;
    }

    await thread.subscribe();

    await persistDiscordMessage({
      conversationId: conversation.id,
      connection,
      role: "user",
      messageId: typeof message.id === "string" ? message.id : rawMessage.id || randomUUID(),
      contentText: message.text || "",
    });

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

    await persistDiscordMessage({
      conversationId: conversation.id,
      connection,
      role: "user",
      messageId: typeof message.id === "string" ? message.id : rawMessage.id || randomUUID(),
      contentText: message.text || "",
    });

    await runAgentAndRespond({
      thread,
      message,
      connection,
      conversationId: conversation.id,
    });
  });

  globalThis.__padynaDiscordHandlersRegistered = true;
}
