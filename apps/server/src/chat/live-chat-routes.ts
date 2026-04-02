import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { liveChatService } from "./live-chat-service";

export const liveChatRoutes = new Hono();

liveChatRoutes.get(
  "/:conversationId/ws",
  upgradeWebSocket((c) => {
    const conversationId = c.req.param("conversationId");
    const headers = new Headers(c.req.raw.headers);
    let connectionId: string | null = null;

    return {
      onOpen(_event, ws) {
        connectionId = liveChatService.registerConnection({
          ws,
          conversationId,
        });
      },
      async onMessage(event) {
        if (!connectionId) {
          return;
        }

        const raw = typeof event.data === "string" ? event.data : event.data.toString();
        await liveChatService.handleIncomingMessage({
          connectionId,
          raw,
          headers,
        });
      },
      onClose() {
        if (!connectionId) {
          return;
        }

        liveChatService.unregisterConnection(connectionId);
        connectionId = null;
      },
      onError() {
        if (!connectionId) {
          return;
        }

        liveChatService.unregisterConnection(connectionId);
        connectionId = null;
      },
    };
  }),
);
