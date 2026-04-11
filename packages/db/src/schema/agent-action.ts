import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const AGENT_ACTION_PROVIDERS = [
  "jira",
  "clickup",
  "discord",
  "slack",
  "calendly",
  "cal",
] as const;

export type AgentActionProvider = (typeof AGENT_ACTION_PROVIDERS)[number];

export type JiraAgentActionConfig = {
  projectId: string;
  projectKey: string;
  projectName: string;
  issueTypeId: string;
  issueTypeName: string;
};

export type CalendlyAgentActionConfig = {
  eventTypeUri: string;
  eventTypeName: string;
  schedulingUrl: string | null;
  duration: number | null;
};

export type ClickUpAgentActionConfig = {
  workspaceId: string;
  workspaceName: string;
  spaceId: string;
  spaceName: string;
  listId: string;
  listName: string;
};

export type DiscordAgentActionConfig = {
  channelId: string;
  channelName: string;
  parentName: string | null;
  audience?: "none" | "here" | "everyone";
};

export type SlackAgentActionConfig = {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  audience?: "channel" | "here" | "everyone";
};

export type CalAgentActionConfig = {
  calUrl: string;
};

export type AgentActionConfig =
  | CalendlyAgentActionConfig
  | CalAgentActionConfig
  | JiraAgentActionConfig
  | ClickUpAgentActionConfig
  | DiscordAgentActionConfig
  | SlackAgentActionConfig;

export const agentAction = pgTable(
  "agent_action",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").$type<AgentActionProvider>().notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    timesUsed: integer("times_used").notNull().default(0),
    config: jsonb("config").$type<AgentActionConfig>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agent_action_chatbot_id_idx").on(table.chatbotId),
    index("agent_action_organization_id_idx").on(table.organizationId),
    index("agent_action_provider_idx").on(table.provider),
  ],
);
