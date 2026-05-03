import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";

export const notionIntegration = pgTable(
  "notion_integration",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),

    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    botId: text("bot_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    workspaceName: text("workspace_name"),
    workspaceIcon: text("workspace_icon"),
    duplicatedTemplateId: text("duplicated_template_id"),
    owner: jsonb("owner").$type<Record<string, unknown>>(),

    isActive: boolean("is_active").notNull().default(true),
    disconnectedAt: timestamp("disconnected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notion_integration_chatbot_id_uidx").on(table.chatbotId),
    index("notion_integration_user_id_idx").on(table.userId),
    index("notion_integration_workspace_id_idx").on(table.workspaceId),
  ],
);

export const notionOAuthState = pgTable(
  "notion_oauth_state",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    state: text("state").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notion_oauth_state_state_uidx").on(table.state),
    index("notion_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("notion_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
