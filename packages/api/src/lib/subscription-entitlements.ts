import { db } from "@padyna/db";
import { subscription } from "@padyna/db/schema/subscription";
import { env } from "@padyna/env/server";
import { and, eq, inArray } from "drizzle-orm";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "uncanceled"] as const;

export async function organizationHasBrandingAddon(organizationId: string) {
  const brandingProductId = env.REMOVE_BRANDING_ADDON;
  if (!brandingProductId) {
    return false;
  }

  const [record] = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(
      and(
        eq(subscription.organizationId, organizationId),
        eq(subscription.productId, brandingProductId),
        inArray(subscription.status, ACTIVE_SUBSCRIPTION_STATUSES),
      ),
    )
    .limit(1);

  return Boolean(record);
}

export function resolveHidePoweredBy({
  hasBrandingAddon,
  hidePoweredBy,
}: {
  hasBrandingAddon: boolean;
  hidePoweredBy: boolean;
}) {
  return hasBrandingAddon && hidePoweredBy;
}
