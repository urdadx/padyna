// import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent, stepCountIs } from "ai";
import { KnowledgeBaseTool } from "./knowledge-base-tool";
import { EscalateToHumanTool } from "./escalate-tool";
import { type AgentUseCase, getAgentPrompt } from "./prompt";
import { createCached } from "@ai-sdk-tools/cache";
import { openai } from "@ai-sdk/openai";

const CHAT_MODEL = "gpt-5.4-mini";

const cached = createCached();

interface CreateSupportChatAgentInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
  chatbotUseCase?: AgentUseCase;
}

export function createSupportChatAgent(input: CreateSupportChatAgentInput) {
  return new ToolLoopAgent({
    model: openai(CHAT_MODEL),
    stopWhen: stepCountIs(5),
    instructions: getAgentPrompt(input.chatbotUseCase ?? "support", input.chatbotName),
    tools: {
      knowledge_base: cached(
        KnowledgeBaseTool({
          chatbotId: input.chatbotId,
          organizationId: input.organizationId,
        }),
      ),
      escalate_to_human: cached(
        EscalateToHumanTool({
          chatbotId: input.chatbotId,
          chatbotName: input.chatbotName,
          organizationId: input.organizationId,
        }),
      ),
    },
  });
}
