import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  integer,
  varchar,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";

export const chatbot = pgTable(
  "chatbot",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    image: text("image"),
    name: text("name"),
    primaryColor: text("primary_color").notNull().default("#6366f1"),
    theme: text("theme").notNull().default("light"),
    hidePoweredBy: boolean("hide_powered_by").notNull().default(false),
    usecase: varchar("usecase", {
      enum: ["support", "technical", "sales"],
    })
      .notNull()
      .default("support"),
    initialMessage: text("initial_message").notNull().default("Hi👋, What can I help you with?"),
    suggestedMessages: text("suggested_messages").array(),

    trainingStatus: text("training_status").default("idle"),
    lastTrainedAt: timestamp("last_trained_at"),
    dataSourcesCount: integer("data_sources_count").default(0).notNull(),

    isEnabled: boolean("is_enabled").notNull().default(true),
    embedToken: text("embed_token").unique(),
    allowedDomains: text("allowed_domains").array(),

    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("chatbot_organization_id_idx").on(table.organizationId)],
);
