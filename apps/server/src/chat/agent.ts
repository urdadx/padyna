import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { createKnowledgeBaseTool } from "./knowledge-base-tool";

const CHAT_MODEL = "gpt-4o-mini";

export function createSupportChatAgent(input: { chatbotId: string; organizationId: string }) {
  return new ToolLoopAgent({
    model: openai(CHAT_MODEL),
    stopWhen: stepCountIs(6),
    instructions:
      "You are a customer support assistant. Use the knowledge_base tool whenever the user asks about business-specific information. If knowledge is missing, say that clearly and ask a concise follow-up question.",
    tools: {
      knowledge_base: createKnowledgeBaseTool({
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
      }),
    },
  });
}
