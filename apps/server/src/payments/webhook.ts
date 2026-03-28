import { Hono } from "hono";
import { Webhooks } from "@polar-sh/hono";
import { db } from "@padyna/db";
import { eq, and, inArray } from "drizzle-orm";
import { user } from "@padyna/db/schema/auth";
import { subscription } from "@padyna/db/schema/subscription";
import { organization } from "@padyna/db/schema/organization";
import { PLAN_LIMITS, ADDON_LIMITS } from "@padyna/api/lib/plan-limits";

async function syncOrganizationLimits(organizationId: string) {
  const subs = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.organizationId, organizationId),
        inArray(subscription.status, ["active", "trialing"]),
      ),
    );

  let maxChatbots = 1;
  let maxMembers = 1;
  let maxDataSourceSize = 20 * 1024 * 1024;

  for (const sub of subs) {
    const planLimits = PLAN_LIMITS[sub.productId ?? ""];
    if (planLimits) {
      maxChatbots = Math.max(maxChatbots, planLimits.maxChatbots);
      maxMembers = Math.max(maxMembers, planLimits.maxMembers);
      maxDataSourceSize = Math.max(maxDataSourceSize, planLimits.maxDataSourceSize);
    }

    const addonType = (sub.metadata as Record<string, unknown>)?.addonType as string | undefined;
    const addonLimits = ADDON_LIMITS[addonType ?? ""];
    if (addonLimits) {
      if (addonLimits.maxChatbots) maxChatbots += addonLimits.maxChatbots;
      if (addonLimits.maxMembers) maxMembers += addonLimits.maxMembers;
    }
  }

  await db
    .update(organization)
    .set({ maxChatbots, maxMembers, maxDataSourceSize })
    .where(eq(organization.id, organizationId));
}

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

          const organizationId = (data.metadata as Record<string, unknown>)?.referenceId as
            | string
            | undefined;

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
                organizationId: organizationId ?? existingSub.organizationId,
                updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
              })
              .where(eq(subscription.polarSubscriptionId, data.id));
          } else {
            await db
              .insert(subscription)
              .values({
                id: data.id,
                userId: userId,
                organizationId: organizationId,
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
                currentPeriodEnd: data.currentPeriodEnd
                  ? new Date(data.currentPeriodEnd)
                  : undefined,
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
              })
              .onConflictDoNothing({
                target: subscription.id,
              });
          }

          if (organizationId) {
            await syncOrganizationLimits(organizationId);
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
