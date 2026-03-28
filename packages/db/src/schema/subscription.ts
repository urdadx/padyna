import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization";

export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),

    polarSubscriptionId: text("polar_subscription_id").notNull().unique(),
    customerId: text("customer_id").notNull(),
    externalId: text("external_id"),

    status: text("status").notNull(),

    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),

    recurringInterval: text("recurring_interval"),
    recurringIntervalCount: integer("recurring_interval_count"),

    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),

    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),

    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at"),
    startedAt: timestamp("started_at"),
    endsAt: timestamp("ends_at"),
    endedAt: timestamp("ended_at"),

    productId: text("product_id"),
    checkoutId: text("checkout_id"),
    discountId: text("discount_id"),

    seats: integer("seats"),

    meters: jsonb("meters"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("subscription_user_id_idx").on(table.userId),
    index("subscription_organization_id_idx").on(table.organizationId),
    index("subscription_customer_id_idx").on(table.customerId),
    index("subscription_status_idx").on(table.status),
  ],
);
