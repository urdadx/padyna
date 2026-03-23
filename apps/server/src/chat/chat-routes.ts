import { createAgentUIStreamResponse } from "ai";
import { Hono } from "hono";
import { authMiddleware } from "../middlewares/authMiddleware";
import { createSupportChatAgent } from "./agents";
import {
  clearConversationMessages,
  loadConversationMessages,
  persistConversationMessages,
} from "./chat-persistence";
import { db } from "@padyna/db";
import { chatbot } from "@padyna/db/schema/index";
import { eq, and } from "drizzle-orm";

type Variables = {
  user: any;
  session: any;
};

export const chatRoutes = new Hono<{ Variables: Variables }>();

chatRoutes.use(authMiddleware);

chatRoutes.post("/", async (c) => {
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

  const [chatbotData] = await db
    .select()
    .from(chatbot)
    .where(and(eq(chatbot.id, activeChatbot), eq(chatbot.organizationId, activeOrganization)))
    .limit(1);

  if (!chatbotData) {
    return c.json({ message: "Chatbot not found" }, 404);
  }

  const chatbotName = chatbotData.name || "AI Assistant";
  const chatbotUseCase = chatbotData.usecase || "support";
  const { body } = await c.req.json();
  const uiMessages = body.messages;

  if (!Array.isArray(uiMessages)) {
    return c.json({ message: "messages must be an array" }, 400);
  }

  const firstMessage = uiMessages[0];
  const firstTextPart = firstMessage?.parts?.find(
    (part: any) => part?.type === "text" && typeof part?.text === "string",
  );
  const title = firstTextPart?.text || "New Conversation";

  await persistConversationMessages({
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
    userId,
    messages: uiMessages,
    title,
  });

  const agent = createSupportChatAgent({
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
    chatbotName,
    chatbotUseCase,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages,
    originalMessages: uiMessages,
    onFinish: async ({ messages }) => {
      await persistConversationMessages({
        chatbotId: activeChatbot,
        organizationId: activeOrganization,
        userId,
        messages,
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

chatRoutes.post("/reset", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;
  const userId = user?.id;

  if (!activeChatbot || !activeOrganization || !userId) {
    return c.json({ message: "No active chatbot, organization, or user" }, 400);
  }

  await clearConversationMessages({
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
    userId,
  });

  return c.json({ success: true });
});
