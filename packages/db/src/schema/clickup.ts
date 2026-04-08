import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";

export const clickupIntegration = pgTable(
  "clickup_integration",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),

    accessToken: text("access_token").notNull(),
    scope: text("scope"),

    isActive: boolean("is_active").notNull().default(true),
    disconnectedAt: timestamp("disconnected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("clickup_integration_chatbot_id_uidx").on(table.chatbotId),
    index("clickup_integration_chatbot_id_idx").on(table.chatbotId),
    index("clickup_integration_user_id_idx").on(table.userId),
  ],
);

export const clickupOAuthState = pgTable(
  "clickup_oauth_state",
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
    uniqueIndex("clickup_oauth_state_state_uidx").on(table.state),
    index("clickup_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("clickup_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
