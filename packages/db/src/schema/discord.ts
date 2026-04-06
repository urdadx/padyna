import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const discordConnection = pgTable(
  "discord_connection",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    guildId: text("guild_id").notNull(),
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
    uniqueIndex("discord_connection_guild_id_uidx").on(table.guildId),
    uniqueIndex("discord_connection_chatbot_id_uidx").on(table.chatbotId),
    index("discord_connection_organization_id_idx").on(table.organizationId),
  ],
);

export const discordOAuthState = pgTable(
  "discord_oauth_state",
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
    uniqueIndex("discord_oauth_state_state_uidx").on(table.state),
    index("discord_oauth_state_chatbot_id_idx").on(table.chatbotId),
    index("discord_oauth_state_expires_at_idx").on(table.expiresAt),
  ],
);
