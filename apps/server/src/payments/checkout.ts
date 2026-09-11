import { Hono } from "hono";
import { env } from "@padyna/env/server";
import { polarClient } from "@padyna/auth/lib/payments";

export const checkout = new Hono();

checkout.get("/checkout", async (c) => {
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
      customerId: url.searchParams.get("customerId") ?? undefined,
      externalCustomerId: url.searchParams.get("customerExternalId") ?? undefined,
      customerEmail: url.searchParams.get("customerEmail") ?? undefined,
      customerName: url.searchParams.get("customerName") ?? undefined,
      customerBillingAddress: url.searchParams.has("customerBillingAddress")
        ? JSON.parse(url.searchParams.get("customerBillingAddress") ?? "{}")
        : undefined,
      customerTaxId: url.searchParams.get("customerTaxId") ?? undefined,
      customerIpAddress: url.searchParams.get("customerIpAddress") ?? undefined,
      customerMetadata: url.searchParams.has("customerMetadata")
        ? JSON.parse(url.searchParams.get("customerMetadata") ?? "{}")
        : undefined,
      allowDiscountCodes: url.searchParams.has("allowDiscountCodes")
        ? url.searchParams.get("allowDiscountCodes") === "true"
        : undefined,
      discountId: url.searchParams.get("discountId") ?? undefined,
      metadata: url.searchParams.has("metadata")
        ? JSON.parse(url.searchParams.get("metadata") ?? "{}")
        : undefined,
      returnUrl: url.searchParams.get("returnUrl") ?? undefined,
    });

    return c.redirect(result.url);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
