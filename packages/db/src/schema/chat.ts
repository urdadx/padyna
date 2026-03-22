import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";
import { organization } from "./organization";
import { user } from "./auth";

export const chatConversation = pgTable(
  "chat_conversation",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull().default("New Conversation"),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    channel: varchar("channel", {
      enum: [
        "web",
        "widget",
        "whatsapp",
        "discord",
        "slack",
        "telegram",
        "googlechat",
        "linear",
        "teams",
        "instagram",
        "messenger",
      ],
    })
      .notNull()
      .default("widget"),
    visibility: varchar("visibility", { enum: ["private", "public"] })
      .notNull()
      .default("private"),
    status: varchar("status", { enum: ["unresolved", "escalated", "resolved"] })
      .notNull()
      .default("unresolved"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("chat_conversation_chatbot_id_idx").on(table.chatbotId),
    index("chat_conversation_organization_id_idx").on(table.organizationId),
    index("chat_conversation_user_id_idx").on(table.userId),
    uniqueIndex("chat_conversation_chatbot_org_user_uidx").on(
      table.chatbotId,
      table.organizationId,
      table.userId,
      table.channel,
      table.visibility,
    ),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["user", "assistant", "system"] }).notNull(),
    messageId: text("message_id").notNull(),
    contentText: text("content_text").notNull().default(""),
    parts: jsonb("parts").$type<unknown[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_message_conversation_id_idx").on(table.conversationId),
    index("chat_message_chatbot_id_idx").on(table.chatbotId),
    index("chat_message_organization_id_idx").on(table.organizationId),
    index("chat_message_user_id_idx").on(table.userId),
    uniqueIndex("chat_message_conversation_message_id_uidx").on(
      table.conversationId,
      table.messageId,
    ),
  ],
);

export const vote = pgTable(
  "vote",
  {
    chatId: uuid("chat_id").notNull(),
    messageId: text("message_id").notNull(),
    isUpvoted: boolean("is_upvoted").notNull(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.messageId] })],
);
