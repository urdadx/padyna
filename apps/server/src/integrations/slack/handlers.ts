import { randomUUID } from "node:crypto";
import { db } from "@padyna/db";
import { chatConversation, chatMessage, chatbot, slackConnection } from "@padyna/db/schema/index";
import { and, eq, sql } from "drizzle-orm";
import { createSupportChatAgent } from "../../chat";
import { SLACK_PENDING_CHANNEL_ID } from "./utils";

declare global {
  var __padynaSlackHandlersRegistered: boolean | undefined;
}

type SlackConnectionRecord = typeof slackConnection.$inferSelect;

type SlackRawMessage = {
  bot_id?: string;
  channel?: string;
  subtype?: string;
  team?: string;
  team_id?: string;
  thread_ts?: string;
  ts?: string;
  user?: string;
};

function logSlackSkip(
  reason: string,
  rawMessage: SlackRawMessage,
  extra?: Record<string, unknown>,
) {
  console.info("[slack-integration] skipped incoming message", {
    reason,
    teamId: rawMessage.team ?? rawMessage.team_id ?? null,
    channelId: rawMessage.channel ?? null,
    threadTs: rawMessage.thread_ts ?? rawMessage.ts ?? null,
    userId: rawMessage.user ?? null,
    subtype: rawMessage.subtype ?? null,
    ...extra,
  });
}

function getSlackRawMessage(message: any) {
  return (message.raw ?? {}) as SlackRawMessage;
}

function getSlackText(message: any) {
  if (typeof message.text === "string") {
    return message.text.trim();
  }

  return "";
}

function getSlackMessageId(message: any) {
  if (typeof message.id === "string" && message.id.length > 0) {
    return message.id;
  }

  const rawMessage = getSlackRawMessage(message);
  return rawMessage.ts ?? randomUUID();
}

async function getChatbotRecord(connection: SlackConnectionRecord) {
  return (
    (await db.query.chatbot.findFirst({
      columns: {
        id: true,
        name: true,
        organizationId: true,
        usecase: true,
      },
      where: eq(chatbot.id, connection.chatbotId),
    })) ?? null
  );
}

async function persistSlackMessage(args: {
  conversationId: string;
  connection: SlackConnectionRecord;
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

async function findConversationByThreadTs(threadTs: string, connection: SlackConnectionRecord) {
  const [conversation] = await db
    .select({
      id: chatConversation.id,
    })
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.channel, "slack"),
        eq(chatConversation.chatbotId, connection.chatbotId),
        eq(chatConversation.organizationId, connection.organizationId),
        sql`${chatConversation.metadata}->>'threadTs' = ${threadTs}`,
      ),
    )
    .limit(1);

  return conversation ?? null;
}

async function createConversationForMention(args: {
  connection: SlackConnectionRecord;
  message: any;
  threadTs: string;
}) {
  const rawMessage = getSlackRawMessage(args.message);
  const teamId = rawMessage.team ?? rawMessage.team_id ?? null;
  const title = getSlackText(args.message) || "Slack conversation";

  const [conversation] = await db
    .insert(chatConversation)
    .values({
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      channel: "slack",
      title,
      metadata: {
        teamId,
        channelId: rawMessage.channel ?? null,
        threadTs: args.threadTs,
        slackUserId: rawMessage.user ?? null,
      },
    })
    .returning({ id: chatConversation.id });

  return conversation ?? null;
}

async function runAgentAndRespond(args: {
  thread: any;
  message: any;
  connection: SlackConnectionRecord;
  conversationId: string;
}) {
  const prompt = getSlackText(args.message);
  if (!prompt) {
    console.info("[slack-integration] empty prompt, replying with fallback message", {
      conversationId: args.conversationId,
    });
    await args.thread.post("I can only respond to text messages right now.");
    return;
  }

  const chatbotRecord = await getChatbotRecord(args.connection);
  if (!chatbotRecord || chatbotRecord.organizationId !== args.connection.organizationId) {
    console.warn("[slack-integration] chatbot missing for slack connection", {
      chatbotId: args.connection.chatbotId,
      organizationId: args.connection.organizationId,
      conversationId: args.conversationId,
    });
    await args.thread.post("This Slack connection points to a chatbot that no longer exists.");
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
      userId: getSlackRawMessage(args.message).user,
      allowEscalation: false,
    });

    const response = await agent.generate({ prompt });
    const responseText = response.text?.trim() || "Sorry, I couldn't generate a response.";

    await persistSlackMessage({
      conversationId: args.conversationId,
      connection: args.connection,
      role: "assistant",
      messageId: randomUUID(),
      contentText: responseText,
    });

    await args.thread.post(responseText);
  } catch (error) {
    console.error("Failed to process Slack message", error);
    await args.thread.post("Something went wrong while generating a response. Please try again.");
  }
}

async function handleInitialSlackMessage(args: {
  source: "mention" | "message";
  thread: any;
  message: any;
}) {
  const rawMessage = getSlackRawMessage(args.message);
  const teamId = rawMessage.team ?? rawMessage.team_id;
  const channelId = rawMessage.channel;
  const threadTs = rawMessage.thread_ts ?? rawMessage.ts;

  if (
    !teamId ||
    !channelId ||
    !threadTs ||
    rawMessage.bot_id ||
    rawMessage.subtype === "bot_message"
  ) {
    logSlackSkip("missing-team-channel-thread-or-bot-message", rawMessage, {
      source: args.source,
    });
    return;
  }

  console.info(`[slack-integration] ${args.source} received`, {
    teamId,
    channelId,
    threadTs,
    messageId: getSlackMessageId(args.message),
    textPreview: getSlackText(args.message).slice(0, 120),
  });

  const connection = await db.query.slackConnection.findFirst({
    where: eq(slackConnection.teamId, teamId),
  });

  if (!connection) {
    logSlackSkip("no-slack-connection-for-team", rawMessage, {
      source: args.source,
      teamId,
    });
    return;
  }

  if (connection.channelId === SLACK_PENDING_CHANNEL_ID) {
    logSlackSkip("slack-connection-pending-channel-selection", rawMessage, {
      source: args.source,
      teamId,
      chatbotId: connection.chatbotId,
    });
    return;
  }

  if (connection.channelId !== channelId) {
    logSlackSkip("message-in-unconfigured-channel", rawMessage, {
      source: args.source,
      configuredChannelId: connection.channelId,
    });
    return;
  }

  const conversation = await createConversationForMention({
    connection,
    message: args.message,
    threadTs,
  });

  if (!conversation) {
    await args.thread.post(
      "I couldn't start a conversation for this Slack workspace. Please try again.",
    );
    return;
  }

  console.info(`[slack-integration] conversation created for ${args.source}`, {
    conversationId: conversation.id,
    teamId,
    channelId,
    threadTs,
  });

  await args.thread.subscribe();

  await persistSlackMessage({
    conversationId: conversation.id,
    connection,
    role: "user",
    messageId: getSlackMessageId(args.message),
    contentText: getSlackText(args.message),
  });

  await runAgentAndRespond({
    thread: args.thread,
    message: args.message,
    connection,
    conversationId: conversation.id,
  });
}

export function registerSlackHandlers(slackBot: any) {
  if (globalThis.__padynaSlackHandlersRegistered) {
    return;
  }

  slackBot.onNewMention(async (thread: any, message: any) => {
    await handleInitialSlackMessage({
      source: "mention",
      thread,
      message,
    });
  });

  slackBot.onNewMessage(/[\s\S]+/, async (thread: any, message: any) => {
    await handleInitialSlackMessage({
      source: "message",
      thread,
      message,
    });
  });

  slackBot.onSubscribedMessage(async (thread: any, message: any) => {
    const rawMessage = getSlackRawMessage(message);
    const teamId = rawMessage.team ?? rawMessage.team_id;
    const channelId = rawMessage.channel;
    const threadTs = rawMessage.thread_ts ?? rawMessage.ts;

    if (
      !teamId ||
      !channelId ||
      !threadTs ||
      rawMessage.bot_id ||
      rawMessage.subtype === "bot_message"
    ) {
      logSlackSkip("missing-team-channel-thread-or-bot-message", rawMessage);
      return;
    }

    console.info("[slack-integration] subscribed message received", {
      teamId,
      channelId,
      threadTs,
      messageId: getSlackMessageId(message),
      textPreview: getSlackText(message).slice(0, 120),
      isMention: Boolean(message.isMention),
    });

    const connection = await db.query.slackConnection.findFirst({
      where: eq(slackConnection.teamId, teamId),
    });

    if (!connection) {
      logSlackSkip("no-slack-connection-for-team", rawMessage, { teamId });
      return;
    }

    if (connection.channelId === SLACK_PENDING_CHANNEL_ID) {
      logSlackSkip("slack-connection-pending-channel-selection", rawMessage, {
        teamId,
        chatbotId: connection.chatbotId,
      });
      return;
    }

    if (connection.channelId !== channelId) {
      logSlackSkip("message-in-unconfigured-channel", rawMessage, {
        configuredChannelId: connection.channelId,
      });
      return;
    }

    const conversation = await findConversationByThreadTs(threadTs, connection);
    if (!conversation) {
      logSlackSkip("no-conversation-found-for-thread", rawMessage, {
        teamId,
        channelId,
        threadTs,
      });
      return;
    }

    console.info("[slack-integration] found existing conversation for subscribed message", {
      conversationId: conversation.id,
      teamId,
      channelId,
      threadTs,
    });

    await persistSlackMessage({
      conversationId: conversation.id,
      connection,
      role: "user",
      messageId: getSlackMessageId(message),
      contentText: getSlackText(message),
    });

    await runAgentAndRespond({
      thread,
      message,
      connection,
      conversationId: conversation.id,
    });
  });

  globalThis.__padynaSlackHandlersRegistered = true;
}
