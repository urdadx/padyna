import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { LiveChatHub } from "./live-chat-hub";

const decoder = new TextDecoder();

/** WebSocket endpoint for a conversation's live chat room, served by `hub`. */
export function createLiveChatRoutes(hub: LiveChatHub) {
  const routes = new Hono();

  routes.get(
    "/:conversationId/ws",
    upgradeWebSocket((c) => {
      const conversationId = c.req.param("conversationId");
      const headers = new Headers(c.req.raw.headers);
      let connectionId: string | null = null;

      const disconnect = () => {
        if (!connectionId) {
          return;
        }

        hub.unregisterConnection(connectionId);
        connectionId = null;
      };

      return {
        onOpen(_event, ws) {
          connectionId = hub.registerConnection({ ws, conversationId, headers });
        },
        onMessage(event) {
          if (!connectionId) {
            return;
          }

          const { data } = event;
          const raw = typeof data === "string" ? data : decoder.decode(data as ArrayBuffer);
          void hub.handleIncomingMessage({ connectionId, raw, headers });
        },
        onClose: disconnect,
        onError: disconnect,
      };
    }),
  );

  return routes;
}
