import { ToolLoopAgent, stepCountIs } from "ai";
import { KnowledgeBaseTool } from "./knowledge-base-tool";
import { EscalateToHumanTool } from "./escalate-tool";
import { type AgentUseCase, getAgentPrompt } from "./prompt";
import { openai } from "@ai-sdk/openai";
import type { ActionProvider } from "@padyna/api/actions/contracts";
import { listEnabledAgentActions } from "../actions/db";
import { CalActionTool } from "../actions/cal-action-tool";
import { CalendlyActionTool } from "../actions/calendly-action-tool";
import { ClickUpActionTool } from "../actions/clickup-action-tool";
import { DiscordActionTool } from "../actions/discord-action-tool";
import { JiraActionTool } from "../actions/jira-action-tool";
import { SlackActionTool } from "../actions/slack-action-tool";

const CHAT_MODEL = "gpt-5.4-mini";

interface CreateSupportChatAgentInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
  chatbotUseCase?: AgentUseCase;
  conversationId?: string;
  userId?: string;
  allowEscalation?: boolean;
}

function toToolKey(actionId: string, provider: string) {
  return `action_${provider}_${actionId.slice(0, 8)}`;
}

type AgentActionRecord = Awaited<ReturnType<typeof listEnabledAgentActions>>[number];

type ActionTool =
  | ReturnType<typeof CalActionTool>
  | ReturnType<typeof CalendlyActionTool>
  | ReturnType<typeof JiraActionTool>
  | ReturnType<typeof ClickUpActionTool>
  | ReturnType<typeof DiscordActionTool>
  | ReturnType<typeof SlackActionTool>;

const providerToolFactories = {
  cal: CalActionTool,
  calendly: CalendlyActionTool,
  jira: JiraActionTool,
  clickup: ClickUpActionTool,
  discord: DiscordActionTool,
  slack: SlackActionTool,
} satisfies Record<ActionProvider, (action: AgentActionRecord) => ActionTool>;

export async function createSupportChatAgent(input: CreateSupportChatAgentInput) {
  const actions = await listEnabledAgentActions({
    chatbotId: input.chatbotId,
    organizationId: input.organizationId,
  });

  const actionToolEntries: Array<[string, ActionTool]> = [];

  for (const action of actions) {
    const createTool = providerToolFactories[action.provider];
    actionToolEntries.push([toToolKey(action.id, action.provider), createTool(action)]);
  }

  const actionTools = Object.fromEntries(actionToolEntries) as Record<string, ActionTool>;

  const tools = {
    knowledge_base: KnowledgeBaseTool({
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
    }),
    ...(input.allowEscalation === false
      ? {}
      : {
          escalate_to_human: EscalateToHumanTool({
            chatbotId: input.chatbotId,
            chatbotName: input.chatbotName,
            organizationId: input.organizationId,
            conversationId: input.conversationId,
            userId: input.userId,
          }),
        }),
    ...actionTools,
  };

  return new ToolLoopAgent({
    model: openai(CHAT_MODEL),
    stopWhen: stepCountIs(5),
    instructions: getAgentPrompt(input.chatbotUseCase ?? "support", input.chatbotName),
    tools,
  });
}
