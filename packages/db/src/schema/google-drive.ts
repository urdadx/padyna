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

export const googleDriveIntegration = pgTable(
  "google_drive_integration",
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
    expiresAt: timestamp("expires_at"),
    scope: text("scope"),
    tokenType: text("token_type"),

    accountId: text("account_id"),
    accountEmail: text("account_email"),
    accountName: text("account_name"),
    accountPicture: text("account_picture"),
    rawProfile: jsonb("raw_profile").$type<Record<string, unknown>>(),

    isActive: boolean("is_active").notNull().default(true),
    disconnectedAt: timestamp("disconnected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("google_drive_integration_chatbot_id_uidx").on(table.chatbotId),
    index("google_drive_integration_user_id_idx").on(table.userId),
    index("google_drive_integration_account_id_idx").on(table.accountId),
  ],
);

export const googleDriveOAuthState = pgTable(
  "google_drive_oauth_state",
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
    uniqueIndex("google_drive_oauth_state_state_uidx").on(table.state),
    index("google_drive_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("google_drive_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
