import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const slackConnection = pgTable(
  "slack_connection",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    teamId: text("team_id").notNull(),
    channelId: text("channel_id").notNull(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("slack_connection_team_id_uidx").on(table.teamId),
    uniqueIndex("slack_connection_chatbot_id_uidx").on(table.chatbotId),
    index("slack_connection_organization_id_idx").on(table.organizationId),
  ],
);

export const slackOAuthState = pgTable(
  "slack_oauth_state",
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
    uniqueIndex("slack_oauth_state_state_uidx").on(table.state),
    index("slack_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("slack_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
