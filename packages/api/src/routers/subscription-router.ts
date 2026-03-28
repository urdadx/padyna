import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, count } from "drizzle-orm";
import { subscription } from "@padyna/db/schema/subscription";
import { organization, member } from "@padyna/db/schema/organization";

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

    const subscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.organizationId, organizationId));

    return subscriptions;
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
});
