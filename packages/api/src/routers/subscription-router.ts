import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, count } from "drizzle-orm";
import { organization, member } from "@padyna/db/schema/organization";
import { env } from "@padyna/env/server";
import { z } from "zod";
import { polarClient } from "@padyna/auth/lib/payments";
import { TRPCError } from "@trpc/server";

// Polar ids from the client are only trusted after checking they belong to the caller's
// organization; the server's Polar token can act on every customer.
async function assertSubscriptionInOrganization(subscriptionId: string, organizationId: string) {
  const subscription = await polarClient.subscriptions.get({ id: subscriptionId });
  if (subscription.metadata?.referenceId !== organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
  }
  return subscription;
}

async function assertOrderInOrganization(orderId: string, organizationId: string) {
  const order = await polarClient.orders.get({ id: orderId });
  if (order.metadata?.referenceId !== organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }
  return order;
}

function requireActiveOrganization(organizationId: string | null | undefined) {
  if (!organizationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
  }
  return organizationId;
}

function isBillingAdmin(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

async function getExternalCustomerId(organizationId: string) {
  const [row] = await db
    .select({ externalCustomerId: organization.externalCustomerId })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row?.externalCustomerId ?? null;
}

export const subscriptionRouter = router({
  getOrganizationLimits: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      return null;
    }

    const [org] = await db
      .select({
        maxChatbots: organization.maxChatbots,
        maxMembers: organization.maxMembers,
        maxDataSourceSize: organization.maxDataSourceSize,
        externalCustomerId: organization.externalCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, organizationId));

    return org;
  }),

  getOrganizationSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const result = await polarClient.subscriptions.list({
      metadata: { referenceId: organizationId },
      limit: 100,
    });

    return result.result.items;
  }),

  getOrganizationOrderList: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const result = await polarClient.orders.list({
      metadata: { referenceId: organizationId },
      limit: 100,
    });

    return result.result.items;
  }),

  getOrderInvoice: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = requireActiveOrganization(ctx.session.session.activeOrganization);
      await assertOrderInOrganization(input.orderId, organizationId);

      const result = await polarClient.orders.invoice({
        id: input.orderId,
      });
      return result.url;
    }),

  getMemberCount: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      return 0;
    }

    const [result] = await db
      .select({ count: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId));

    return result?.count ?? 0;
  }),

  getCustomerState: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      return null;
    }
    const externalCustomerId = await getExternalCustomerId(organizationId);
    if (!externalCustomerId) return null;
    return polarClient.customers.getStateExternal({
      externalId: externalCustomerId,
    });
  }),

  // we are usingg the api directly here cos polar ts sdk has wrong types for this functionality
  updateBillingEmail: protectedProcedure
    .input(z.object({ email: z.email() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = requireActiveOrganization(ctx.session.session.activeOrganization);
      if (!isBillingAdmin(ctx.memberRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update billing" });
      }

      const externalCustomerId = await getExternalCustomerId(organizationId);
      if (!externalCustomerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No billing account found" });
      }

      await polarClient.customers.updateExternal({
        externalId: externalCustomerId,
        customerUpdateExternalID: { email: input.email },
      });
    }),

  cancelSubscription: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = requireActiveOrganization(ctx.session.session.activeOrganization);
      if (!isBillingAdmin(ctx.memberRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can cancel subscriptions" });
      }

      await assertSubscriptionInOrganization(input.id, organizationId);
      await polarClient.subscriptions.update({
        id: input.id,
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      });
    }),

  endTrial: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const organizationId = requireActiveOrganization(ctx.session.session.activeOrganization);
    // Ending the trial starts billing, so it's for billing admins only, like cancelling.
    if (!isBillingAdmin(ctx.memberRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can end the trial" });
    }
    await assertSubscriptionInOrganization(input.id, organizationId);

    const response = await fetch(`${env.POLAR_API_URL}/subscriptions/${input.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ trial_end: "now" }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }),
});
