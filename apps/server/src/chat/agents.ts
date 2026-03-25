import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent, stepCountIs } from "ai";
import { KnowledgeBaseTool } from "./knowledge-base-tool";
import { type AgentUseCase, getAgentPrompt } from "./prompt";
import { createCached } from "@ai-sdk-tools/cache";

const CHAT_MODEL = "claude-haiku-4-5-20251001";

const cached = createCached();

interface CreateSupportChatAgentInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
  chatbotUseCase?: AgentUseCase;
}

export function createSupportChatAgent(input: CreateSupportChatAgentInput) {
  return new ToolLoopAgent({
    model: anthropic(CHAT_MODEL),
    stopWhen: stepCountIs(5),
    instructions: getAgentPrompt(input.chatbotUseCase ?? "support", input.chatbotName),
    tools: {
      knowledge_base: cached(
        KnowledgeBaseTool({
          chatbotId: input.chatbotId,
          organizationId: input.organizationId,
        }),
      ),
    },
  });
}
