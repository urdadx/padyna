import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";

export const jiraIntegration = pgTable(
  "jira_integration",
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
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    scope: text("scope"),

    cloudId: text("cloud_id").notNull(),
    siteUrl: text("site_url").notNull(),
    siteName: text("site_name").notNull(),
    siteAvatarUrl: text("site_avatar_url"),

    isActive: boolean("is_active").notNull().default(true),
    disconnectedAt: timestamp("disconnected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("jira_integration_chatbot_id_uidx").on(table.chatbotId),
    index("jira_integration_chatbot_id_idx").on(table.chatbotId),
    index("jira_integration_user_id_idx").on(table.userId),
  ],
);

export const jiraOAuthState = pgTable(
  "jira_oauth_state",
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
    uniqueIndex("jira_oauth_state_state_uidx").on(table.state),
    index("jira_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("jira_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
