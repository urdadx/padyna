import {
  pgTable,
  text,
  timestamp,
  index,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";

export const visitorSessions = pgTable(
  "visitor_sessions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    visitorId: text("visitor_id").notNull(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),

    userAgent: text("user_agent"),
    deviceType: varchar("device_type", {
      enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
    })
      .notNull()
      .default("unknown"),
    platform: text("platform"),

    city: text("city"),
    region: text("region"),
    country: text("country"),
    countryCode: text("country_code"),
    continent: text("continent"),
    ip: text("ip"),
    referrer: text("referrer"),

    startedAt: timestamp("started_at")
      .notNull()
      .$defaultFn(() => new Date()),
    endedAt: timestamp("ended_at"),
    pageViews: integer("page_views").notNull().default(0),
    durationMs: integer("duration_ms"),

    isBounce: boolean("is_bounce").notNull().default(false), // Single page view, < 10s

    extra: jsonb("extra"),

    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("visitor_sessions_chatbot_id_idx").on(table.chatbotId),
    index("visitor_sessions_visitor_id_idx").on(table.visitorId),
    index("visitor_sessions_started_at_idx").on(table.startedAt),
    index("visitor_sessions_chatbot_started_idx").on(table.chatbotId, table.startedAt),
    index("visitor_sessions_country_code_idx").on(table.countryCode),
    index("visitor_sessions_device_type_idx").on(table.deviceType),
    index("visitor_sessions_platform_idx").on(table.platform),
    index("visitor_sessions_ended_at_idx").on(table.endedAt),
  ],
);
