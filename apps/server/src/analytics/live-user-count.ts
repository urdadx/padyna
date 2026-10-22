import { RedisClient } from "bun";
import { analyticsEvents } from "@padyna/api/lib/events";
import { env } from "@padyna/env/server";
import { createPresenceTracker } from "./presence-tracker";

const PRESENCE_TTL_MS = 45_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

const redis = new RedisClient(env.REDIS_URL ?? "redis://localhost:6379");

const tracker = createPresenceTracker({
  redis,
  ttlMs: PRESENCE_TTL_MS,
  // Open analytics streams refetch their overview on this event, so it is
  // throttled per chatbot rather than fired for every visitor that comes and goes.
  onChange: (chatbotId) => {
    analyticsEvents.emit("analytics-update", { chatbotId, action: "presence-update" });
  },
});

let started = false;

/** Starts the heartbeat and removes this server's connections on shutdown. */
export function ensurePresenceShutdownHooks() {
  if (started) {
    return;
  }

  started = true;

  const heartbeat = setInterval(() => {
    void tracker.heartbeat();
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref?.();

  const runCleanup = () => {
    clearInterval(heartbeat);
    void tracker.removeAll();
  };

  process.once("SIGINT", runCleanup);
  process.once("SIGTERM", runCleanup);
  process.once("beforeExit", runCleanup);
}

export function getLivePresenceCount(chatbotId: string): Promise<number> {
  return tracker.count(chatbotId);
}

export function registerPresenceConnection(chatbotId: string, connectionId: string) {
  ensurePresenceShutdownHooks();
  return tracker.register(chatbotId, connectionId);
}

export function unregisterPresenceConnection(connectionId: string) {
  return tracker.unregister(connectionId);
}
