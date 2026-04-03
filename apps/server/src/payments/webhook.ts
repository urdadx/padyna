import { Hono } from "hono";
import { Webhooks } from "@polar-sh/hono";
import { db } from "@padyna/db";
import { createOrganizationNotification } from "@padyna/db/notifications";
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

    const addonLimits = ADDON_LIMITS[sub.productId ?? ""];
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

async function createBillingNotifications(input: {
  organizationId: string | undefined;
  userId: string;
  subscriptionId: string;
  status: string;
  previousStatus?: string;
  trialStart?: Date | null;
  previousTrialStart?: Date | null;
  trialEnd?: Date | null;
  canceledAt?: Date | null;
  previousCanceledAt?: Date | null;
  modifiedAt?: Date | null;
}) {
  if (!input.organizationId) {
    return;
  }

  const justStartedTrial =
    input.status === "trialing" &&
    (input.previousStatus !== "trialing" ||
      (input.trialStart?.toISOString() ?? null) !== (input.previousTrialStart?.toISOString() ?? null));

  const justEndedTrial = input.previousStatus === "trialing" && input.status !== "trialing";

  const justCanceled =
    (input.status === "canceled" || input.status === "revoked") &&
    (input.previousStatus !== input.status ||
      (input.canceledAt?.toISOString() ?? null) !== (input.previousCanceledAt?.toISOString() ?? null));

  if (justStartedTrial) {
    await createOrganizationNotification({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      eventType: "billing.trial_started",
      entityType: "subscription",
      entityId: input.subscriptionId,
      title: "Trial started",
      body: "Your organization trial is now active.",
      metadata: {
        subscriptionId: input.subscriptionId,
        status: input.status,
        trialStart: input.trialStart?.toISOString(),
        trialEnd: input.trialEnd?.toISOString(),
      },
      dedupeKey: `billing.trial_started:${input.subscriptionId}:${input.trialStart?.toISOString() ?? input.modifiedAt?.toISOString() ?? ""}`,
    });
  }

  if (justEndedTrial) {
    await createOrganizationNotification({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      eventType: "billing.trial_ended",
      entityType: "subscription",
      entityId: input.subscriptionId,
      title: "Trial ended",
      body: "Your organization trial has ended.",
      metadata: {
        subscriptionId: input.subscriptionId,
        previousStatus: input.previousStatus,
        status: input.status,
        trialEnd: input.trialEnd?.toISOString(),
      },
      dedupeKey: `billing.trial_ended:${input.subscriptionId}:${input.trialEnd?.toISOString() ?? input.modifiedAt?.toISOString() ?? ""}`,
    });
  }

  if (justCanceled) {
    await createOrganizationNotification({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      eventType: "billing.subscription_cancelled",
      entityType: "subscription",
      entityId: input.subscriptionId,
      title: "Subscription cancelled",
      body: "Your organization subscription was cancelled.",
      metadata: {
        subscriptionId: input.subscriptionId,
        previousStatus: input.previousStatus,
        status: input.status,
        canceledAt: input.canceledAt?.toISOString(),
      },
      dedupeKey: `billing.subscription_cancelled:${input.subscriptionId}:${input.canceledAt?.toISOString() ?? input.modifiedAt?.toISOString() ?? input.status}`,
    });
  }
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
                trialStart: data.trialStart ? new Date(data.trialStart) : undefined,
                trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
                endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
                endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
                seats: data.seats,
                meters: data.meters,
                metadata: data.metadata,
                organizationId: organizationId ?? existingSub.organizationId,
                updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
              })
              .where(eq(subscription.polarSubscriptionId, data.id));

            try {
              await createBillingNotifications({
                organizationId: organizationId ?? existingSub.organizationId ?? undefined,
                userId,
                subscriptionId: data.id,
                status: data.status,
                previousStatus: existingSub.status,
                trialStart: data.trialStart ? new Date(data.trialStart) : null,
                previousTrialStart: existingSub.trialStart,
                trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
                canceledAt: data.canceledAt ? new Date(data.canceledAt) : null,
                previousCanceledAt: existingSub.canceledAt,
                modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : null,
              });
            } catch (error) {
              console.error("Failed to create billing notifications:", error);
            }
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

            try {
              await createBillingNotifications({
                organizationId,
                userId,
                subscriptionId: data.id,
                status: data.status,
                trialStart: data.trialStart ? new Date(data.trialStart) : null,
                trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
                canceledAt: data.canceledAt ? new Date(data.canceledAt) : null,
                modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : null,
              });
            } catch (error) {
              console.error("Failed to create billing notifications:", error);
            }
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
