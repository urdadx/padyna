import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, count } from "drizzle-orm";
import { organization, member } from "@padyna/db/schema/organization";
import { env } from "@padyna/env/server";
import { z } from "zod";
import { polarClient } from "@padyna/auth/lib/payments";

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
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

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

  // we are usingg the api directly here cos polar ts sdk has wrong types for this functionality
  endTrial: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
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
