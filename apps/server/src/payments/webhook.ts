import { Hono } from "hono";
import { Webhooks } from "@polar-sh/hono";
import { db } from "@padyna/db";
import { eq } from "drizzle-orm";
import { user } from "@padyna/db/schema/auth";
import { subscription } from "@padyna/db/schema/subscription";

export const polarWebhook = new Hono();

polarWebhook.post(
  "/webhook/polar",
  Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
    onPayload: async ({ data, type }) => {
      if (
        type === "subscription.created" ||
        type === "subscription.active" ||
        type === "subscription.canceled" ||
        type === "subscription.revoked" ||
        type === "subscription.uncanceled" ||
        type === "subscription.updated"
      ) {
        console.log("Processing subscription webhook:", type);

        const userId = data.customer?.externalId;
        if (!userId) {
          console.error("No external ID found for subscription", {
            subscriptionId: data.id,
            customerId: data.customerId,
          });
          return;
        }

        const isSubscribed = ["active", "trialing", "uncanceled"].includes(data.status);

        try {
          await db.update(user).set({ isSubscribed }).where(eq(user.id, userId));

          const existingSub = await db.query.subscription.findFirst({
            where: eq(subscription.polarSubscriptionId, data.id),
          });

          if (existingSub) {
            await db
              .update(subscription)
              .set({
                status: data.status,
                amount: data.amount,
                currency: data.currency,
                recurringInterval: data.recurringInterval,
                recurringIntervalCount: data.recurringIntervalCount,
                currentPeriodStart: data.currentPeriodStart
                  ? new Date(data.currentPeriodStart)
                  : undefined,
                currentPeriodEnd: data.currentPeriodEnd
                  ? new Date(data.currentPeriodEnd)
                  : undefined,
                cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
                canceledAt: data.canceledAt ? new Date(data.canceledAt) : undefined,
                endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
                endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
                seats: data.seats,
                meters: data.meters,
                metadata: data.metadata,
                updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
              })
              .where(eq(subscription.polarSubscriptionId, data.id));
          } else {
            await db.insert(subscription).values({
              id: data.id,
              userId: userId,
              polarSubscriptionId: data.id,
              customerId: data.customerId,
              externalId: data.customer?.externalId,
              status: data.status,
              amount: data.amount,
              currency: data.currency,
              recurringInterval: data.recurringInterval,
              recurringIntervalCount: data.recurringIntervalCount,
              currentPeriodStart: data.currentPeriodStart
                ? new Date(data.currentPeriodStart)
                : undefined,
              currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
              trialStart: data.trialStart ? new Date(data.trialStart) : undefined,
              trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
              cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
              canceledAt: data.canceledAt ? new Date(data.canceledAt) : undefined,
              startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
              endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
              endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
              productId: data.productId,
              checkoutId: data.checkoutId,
              discountId: data.discountId,
              seats: data.seats,
              meters: data.meters,
              metadata: data.metadata,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
            });
          }

          console.log(`User ${userId} subscription updated: ${data.status}`);
        } catch (error) {
          console.error("Error updating subscription:", error);
        }
      } else {
        console.log("Ignoring non-subscription webhook:", type);
      }
    },
  }),
);
