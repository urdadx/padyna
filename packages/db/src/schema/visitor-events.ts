import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  index,
  uuid,
  varchar,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";
import { visitorSessions } from "./visitor-sessions";

export const visitorEvents = pgTable(
  "visitor_events",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => visitorSessions.id, { onDelete: "cascade" }),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),

    event: varchar("event", {
      enum: [
        "session_start",
        "session_end",
        "page_view",
        "chat_started",
        "chat_message",
        "widget_open",
        "widget_close",
      ],
    }).notNull(),

    conversationId: uuid("conversation_id"),

    durationMs: integer("duration_ms"),
    timestamp: timestamp("timestamp")
      .notNull()
      .$defaultFn(() => new Date()),

    extra: jsonb("extra"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("visitor_events_session_id_idx").on(table.sessionId),
    index("visitor_events_chatbot_id_idx").on(table.chatbotId),
    index("visitor_events_visitor_id_idx").on(table.visitorId),
    index("visitor_events_event_idx").on(table.event),
    index("visitor_events_timestamp_idx").on(table.timestamp),
    index("visitor_events_chatbot_event_timestamp_idx").on(
      table.chatbotId,
      table.event,
      table.timestamp,
    ),
    index("visitor_events_conversation_id_idx").on(table.conversationId),
  ],
);

export const visitorSessionRelations = relations(visitorSessions, ({ one, many }) => ({
  chatbot: one(chatbot, {
    fields: [visitorSessions.chatbotId],
    references: [chatbot.id],
  }),
  events: many(visitorEvents),
}));

export const visitorEventRelations = relations(visitorEvents, ({ one }) => ({
  session: one(visitorSessions, {
    fields: [visitorEvents.sessionId],
    references: [visitorSessions.id],
  }),
  chatbot: one(chatbot, {
    fields: [visitorEvents.chatbotId],
    references: [chatbot.id],
  }),
}));
