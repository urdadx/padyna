import type { Context as HonoContext } from "hono";

import { auth } from "@padyna/auth";

type LiveChatBroadcastStatus = "opened" | "escalated" | "assigned" | "closed";

export type CreateContextOptions = {
  context: HonoContext;
  liveChat?: {
    broadcastConversationStatus?: (input: {
      conversationId: string;
      status: LiveChatBroadcastStatus;
    }) => void;
  };
};

export async function createContext({ context, liveChat }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const headers = context.req.raw.headers;
  const hostname = new URL(context.req.raw.url).hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const rawCountryCode = headers.get("cf-ipcountry")?.toUpperCase();
  const countryCode = rawCountryCode && /^[A-Z]{2}$/.test(rawCountryCode) && rawCountryCode !== "XX"
    ? rawCountryCode
    : isLocalhost
      ? "GH"
    : undefined;
  const country = countryCode
    ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? undefined
    : undefined;

  return {
    session,
    liveChat,
    request: {
      headers: {
        countryCode,
        city: headers.get("cf-ipcity") || (isLocalhost ? "Accra" : undefined),
        region: headers.get("cf-region") || (isLocalhost ? "Greater Accra" : undefined),
        country,
        continent: headers.get("cf-ipcontinent") || (isLocalhost ? "AF" : undefined),
        userAgent: headers.get("user-agent") || undefined,
        referer: headers.get("referer") || undefined,
      },
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
