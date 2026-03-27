import { Hono } from "hono";
import { Checkout } from "@polar-sh/hono";
import { env } from "@padyna/env/server";
export const checkout = new Hono();

checkout.get(
  "/checkout",
  Checkout({
    accessToken: env.POLAR_ACCESS_TOKEN!,
    successUrl: env.POLAR_SUCCESS_URL!,
    // returnUrl: "https://myapp.com",
    server: "sandbox",
  }),
);
