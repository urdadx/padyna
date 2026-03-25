import type { Context as HonoContext } from "hono";

import { auth } from "@padyna/auth";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const headers = context.req.raw.headers;

  return {
    session,
    request: {
      headers: {
        countryCode: headers.get("cf-ipcountry") || "GH",
        city: headers.get("cf-ipcity") || "Accra",
        region: headers.get("cf-region") || "Greater Accra",
        country: headers.get("cf-country") || "Ghana",
        continent: headers.get("cf-continent") || "AF",
        userAgent: headers.get("user-agent") || undefined,
        referer: headers.get("referer") || undefined,
      },
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
