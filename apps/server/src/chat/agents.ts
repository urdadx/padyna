import { ToolLoopAgent, stepCountIs } from "ai";
import { KnowledgeBaseTool } from "./knowledge-base-tool";
import { EscalateToHumanTool } from "./escalate-tool";
import { type AgentUseCase, getAgentPrompt } from "./prompt";
import { createCached } from "@ai-sdk-tools/cache";
import { openai } from "@ai-sdk/openai";
import { listEnabledAgentActions } from "../actions/db";
import { CalActionTool } from "../actions/cal-action-tool";
import { CalendlyActionTool } from "../actions/calendly-action-tool";
import { ClickUpActionTool } from "../actions/clickup-action-tool";
import { DiscordActionTool } from "../actions/discord-action-tool";
import { JiraActionTool } from "../actions/jira-action-tool";
import { SlackActionTool } from "../actions/slack-action-tool";

const CHAT_MODEL = "gpt-5.4-mini";

const cached = createCached();

interface CreateSupportChatAgentInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
  chatbotUseCase?: AgentUseCase;
  conversationId?: string;
  userId?: string;
  allowEscalation?: boolean;
}

function toToolKey(name: string, actionId: string, prefix: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return `${prefix}_${normalized || "tool"}_${actionId.slice(0, 8)}`;
}

export async function createSupportChatAgent(input: CreateSupportChatAgentInput) {
  const actions = await listEnabledAgentActions({
    chatbotId: input.chatbotId,
    organizationId: input.organizationId,
  });

  type ActionTool =
    | ReturnType<typeof CalActionTool>
    | ReturnType<typeof CalendlyActionTool>
    | ReturnType<typeof JiraActionTool>
    | ReturnType<typeof ClickUpActionTool>
    | ReturnType<typeof DiscordActionTool>
    | ReturnType<typeof SlackActionTool>;

  const actionToolEntries: Array<[string, ActionTool]> = [];

  for (const action of actions) {
    if (action.provider === "cal") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "cal_action"),
        CalActionTool(action),
      ]);
      continue;
    }

    if (action.provider === "calendly") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "calendly_action"),
        CalendlyActionTool(action),
      ]);
      continue;
    }

    if (action.provider === "jira") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "jira_action"),
        JiraActionTool(action),
      ]);
      continue;
    }

    if (action.provider === "clickup") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "clickup_action"),
        ClickUpActionTool(action),
      ]);
      continue;
    }

    if (action.provider === "discord") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "discord_action"),
        DiscordActionTool(action),
      ]);
      continue;
    }

    if (action.provider === "slack") {
      actionToolEntries.push([
        toToolKey(action.name, action.id, "slack_action"),
        SlackActionTool(action),
      ]);
    }
  }

  const actionTools = Object.fromEntries(actionToolEntries) as Record<string, ActionTool>;

  const tools = {
    knowledge_base: cached(
      KnowledgeBaseTool({
        chatbotId: input.chatbotId,
        organizationId: input.organizationId,
      }),
    ),
    ...(input.allowEscalation === false
      ? {}
      : {
          escalate_to_human: cached(
            EscalateToHumanTool({
              chatbotId: input.chatbotId,
              chatbotName: input.chatbotName,
              organizationId: input.organizationId,
              conversationId: input.conversationId,
              userId: input.userId,
            }),
          ),
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
