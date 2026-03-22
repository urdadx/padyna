import { relations } from "drizzle-orm";
import { pgTable, index, uuid, integer, date, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { chatbot } from "./chatbot";

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),

    totalSessions: integer("total_sessions").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    bounceCount: integer("bounce_count").notNull().default(0),
    engagedCount: integer("engaged_count").notNull().default(0),

    avgSessionDurationMs: integer("avg_session_duration_ms"),
    avgTimeOnPageMs: integer("avg_time_on_page_ms"),

    totalChatsStarted: integer("total_chats_started").notNull().default(0),
    totalMessages: integer("total_messages").notNull().default(0),

    desktopSessions: integer("desktop_sessions").notNull().default(0),
    mobileSessions: integer("mobile_sessions").notNull().default(0),
    tabletSessions: integer("tablet_sessions").notNull().default(0),
    botSessions: integer("bot_sessions").notNull().default(0),

    platformBreakdown: jsonb("platform_breakdown").$type<Record<string, number>>(),
    deviceTypeBreakdown: jsonb("device_type_breakdown").$type<Record<string, number>>(),

    countryBreakdown: jsonb("country_breakdown").$type<Record<string, number>>(),
    cityBreakdown: jsonb("city_breakdown").$type<Record<string, number>>(),
    continentBreakdown: jsonb("continent_breakdown").$type<Record<string, number>>(),

    referralSourceBreakdown: jsonb("referral_source_breakdown").$type<Record<string, number>>(),
    referrerBreakdown: jsonb("referrer_breakdown").$type<Record<string, number>>(),

    pageBreakdown: jsonb("page_breakdown").$type<Record<string, number>>(),

    eventBreakdown: jsonb("event_breakdown").$type<Record<string, number>>(),

    extra: jsonb("extra"),
  },
  (table) => [
    index("analytics_daily_chatbot_id_idx").on(table.chatbotId),
    index("analytics_daily_date_idx").on(table.date),
    uniqueIndex("analytics_daily_chatbot_date_idx").on(table.chatbotId, table.date),
  ],
);

export const analyticsDailyRelations = relations(analyticsDaily, ({ one }) => ({
  chatbot: one(chatbot, {
    fields: [analyticsDaily.chatbotId],
    references: [chatbot.id],
  }),
}));

export const analyticsWeekly = pgTable(
  "analytics_weekly",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),

    weekStart: date("week_start", { mode: "date" }).notNull(),
    weekEnd: date("week_end", { mode: "date" }).notNull(),

    totalSessions: integer("total_sessions").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    bounceCount: integer("bounce_count").notNull().default(0),
    engagedCount: integer("engaged_count").notNull().default(0),
    avgSessionDurationMs: integer("avg_session_duration_ms"),
    totalChatsStarted: integer("total_chats_started").notNull().default(0),
    totalMessages: integer("total_messages").notNull().default(0),

    countryBreakdown: jsonb("country_breakdown").$type<Record<string, number>>(),
    referralSourceBreakdown: jsonb("referral_source_breakdown").$type<Record<string, number>>(),
    deviceTypeBreakdown: jsonb("device_type_breakdown").$type<Record<string, number>>(),
  },
  (table) => [
    index("analytics_weekly_chatbot_id_idx").on(table.chatbotId),
    index("analytics_weekly_week_start_idx").on(table.weekStart),
    uniqueIndex("analytics_weekly_chatbot_week_idx").on(table.chatbotId, table.weekStart),
  ],
);

export const analyticsMonthly = pgTable(
  "analytics_monthly",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatbotId: uuid("chatbot_id")
      .notNull()
      .references(() => chatbot.id, { onDelete: "cascade" }),

    year: integer("year").notNull(),
    month: integer("month").notNull(),

    totalSessions: integer("total_sessions").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    bounceCount: integer("bounce_count").notNull().default(0),
    engagedCount: integer("engaged_count").notNull().default(0),
    avgSessionDurationMs: integer("avg_session_duration_ms"),
    totalChatsStarted: integer("total_chats_started").notNull().default(0),
    totalMessages: integer("total_messages").notNull().default(0),

    countryBreakdown: jsonb("country_breakdown").$type<Record<string, number>>(),
    referralSourceBreakdown: jsonb("referral_source_breakdown").$type<Record<string, number>>(),
    deviceTypeBreakdown: jsonb("device_type_breakdown").$type<Record<string, number>>(),
  },
  (table) => [
    index("analytics_monthly_chatbot_id_idx").on(table.chatbotId),
    uniqueIndex("analytics_monthly_chatbot_year_month_idx").on(
      table.chatbotId,
      table.year,
      table.month,
    ),
  ],
);
