import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chatbot } from "./chatbot";
import { organization } from "./organization";

export const notificationEventTypeValues = [
  "chat.escalated",
  "chat.opened",
  "chat.closed",
  "chat.priority_marked",
  "chat.deleted",
  "conversation.human_joined",
  "conversation.agent_joined",
  "agent.created",
  "team.member_invited",
  "team.name_updated",
  "billing.trial_started",
  "billing.trial_ended",
  "billing.subscription_cancelled",
  "visitor.new_unique",
] as const;

export const notificationEntityTypeValues = [
  "conversation",
  "chatbot",
  "organization",
  "subscription",
  "invitation",
  "visitor",
] as const;

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id").references(() => chatbot.id, { onDelete: "set null" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => user.id, { onDelete: "set null" }),

    eventType: varchar("event_type", { enum: notificationEventTypeValues }).notNull(),
    entityType: varchar("entity_type", { enum: notificationEntityTypeValues }),
    entityId: text("entity_id"),

    title: text("title").notNull(),
    body: text("body"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at"),

    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notification_organization_id_idx").on(table.organizationId),
    index("notification_chatbot_id_idx").on(table.chatbotId),
    index("notification_recipient_user_id_idx").on(table.recipientUserId),
    index("notification_recipient_is_read_created_idx").on(
      table.recipientUserId,
      table.isRead,
      table.createdAt,
    ),
    index("notification_org_created_idx").on(table.organizationId, table.createdAt),
    uniqueIndex("notification_recipient_dedupe_uidx").on(table.recipientUserId, table.dedupeKey),
  ],
);

export type NotificationEventType = (typeof notificationEventTypeValues)[number];
export type NotificationEntityType = (typeof notificationEntityTypeValues)[number];
