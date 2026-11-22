import { Hono } from "hono";
import { auth } from "@padyna/auth";
import { env } from "@padyna/env/server";
import { polarClient } from "@padyna/auth/lib/payments";
import { getMemberRole } from "@padyna/api/lib/membership";

export const checkout = new Hono();

/** Labels the dashboard sends with a checkout; anything else in `metadata` is ignored. */
function readCheckoutLabels(raw: string | null) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const labels: Record<string, string> = {};
    for (const key of ["planName", "addonType"]) {
      const value = parsed[key];
      if (typeof value === "string" && value.length <= 100) labels[key] = value;
    }
    return labels;
  } catch {
    return {};
  }
}

// The customer and the organization being paid for come from the signed-in session, never from
// the query string: the webhook trusts them to decide which user and organization get the plan.
checkout.get("/checkout", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const organizationId = (session?.session as { activeOrganization?: string | null } | undefined)
    ?.activeOrganization;
  if (!session?.user || !organizationId) {
    return c.redirect(`${env.CORS_ORIGIN}/login`);
  }
  if (!(await getMemberRole(session.user.id, organizationId))) {
    return c.json({ error: "You are not a member of this organization" }, 403);
  }

  const url = new URL(c.req.url);
  const products = url.searchParams.getAll("products");

  if (products.length === 0) {
    return c.json({ error: "Missing products in query params" }, 400);
  }

  const successUrl = new URL(env.POLAR_SUCCESS_URL!);
  successUrl.searchParams.set("checkoutId", "{CHECKOUT_ID}");

  try {
    const result = await polarClient.checkouts.create({
      products,
      successUrl: decodeURI(successUrl.toString()),
      externalCustomerId: session.user.id,
      customerEmail: session.user.email ?? undefined,
      customerName: session.user.name ?? undefined,
      metadata: {
        ...readCheckoutLabels(url.searchParams.get("metadata")),
        referenceId: organizationId,
      },
    });

    return c.redirect(result.url);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
