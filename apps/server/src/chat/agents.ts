import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { KnowledgeBaseTool } from "./knowledge-base-tool";
import { customerSupportPrompt } from "./prompt";

const CHAT_MODEL = "gpt-5.4";

interface CreateSupportChatAgentInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
}

export function createSupportChatAgent(input: CreateSupportChatAgentInput) {
  return new ToolLoopAgent({
    model: openai(CHAT_MODEL),
    stopWhen: stepCountIs(5),
    instructions: customerSupportPrompt(input.chatbotName || "AI Assistant"),
    tools: {
      knowledge_base: KnowledgeBaseTool({
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
      }),
    },
  });
}
