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

  return {
    session,
    liveChat,
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
