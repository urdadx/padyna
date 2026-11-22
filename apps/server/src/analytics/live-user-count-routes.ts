import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import {
  ensurePresenceShutdownHooks,
  registerPresenceConnection,
  unregisterPresenceConnection,
} from "./live-user-count";

export const presenceRoutes = new Hono();

ensurePresenceShutdownHooks();

presenceRoutes.get(
  "/:chatbotId/ws",
  upgradeWebSocket((c) => {
    const chatbotId = c.req.param("chatbotId")!;
    const connectionId = randomUUID();
    let isClosed = false;
    let cleanupStarted = false;

    const cleanup = () => {
      if (cleanupStarted) {
        return;
      }
      cleanupStarted = true;
      void unregisterPresenceConnection(connectionId);
    };

    return {
      onOpen(_event, ws) {
        void registerPresenceConnection(chatbotId, connectionId)
          .then(() => {
            if (isClosed) {
              cleanup();
            }
          })
          .catch((error) => {
            console.error("[liveusercount/ws] register failed:", error);
            ws.close(1011, "Live user count registration failed");
          });
      },
      onClose() {
        isClosed = true;
        cleanup();
      },
      onError() {
        isClosed = true;
        cleanup();
      },
    };
  }),
);
