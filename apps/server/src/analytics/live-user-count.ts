import { RedisClient } from "bun";
import { analyticsEvents } from "@padyna/api/lib/events";
import { env } from "@padyna/env/server";

type LiveCountUpdatePayload = {
  chatbotId: string;
  count: number;
  updatedAt: string;
};

const redisUrl = env.REDIS_URL ?? "redis://localhost:6379";

const redis = new RedisClient(redisUrl);

const managedConnections = new Set<string>();
const connectionToChatbot = new Map<string, string>();

let shutdownHooksRegistered = false;

function presenceSetKey(chatbotId: string) {
  return `presence:chatbot:${chatbotId}`;
}

function connectionKey(connectionId: string) {
  return `presence:conn:${connectionId}`;
}

function updateChannel(chatbotId: string) {
  return `presence:update:${chatbotId}`;
}

async function publishPresenceCount(chatbotId: string, count: number) {
  const payload: LiveCountUpdatePayload = {
    chatbotId,
    count,
    updatedAt: new Date().toISOString(),
  };

  await redis.publish(updateChannel(chatbotId), JSON.stringify(payload));
}

export async function getLivePresenceCount(chatbotId: string): Promise<number> {
  const count = await redis.scard(presenceSetKey(chatbotId));
  return Number(count ?? 0);
}

async function publishCurrentPresenceCount(chatbotId: string): Promise<number> {
  const count = await getLivePresenceCount(chatbotId);
  await publishPresenceCount(chatbotId, count);
  analyticsEvents.emit("analytics-update", { chatbotId, action: "presence-update" });
  return count;
}

async function cleanupConnection(connectionId: string) {
  const mappedChatbotId = connectionToChatbot.get(connectionId);
  const reverseValue = await redis.get(connectionKey(connectionId));
  const chatbotId = mappedChatbotId ?? reverseValue ?? null;

  connectionToChatbot.delete(connectionId);
  managedConnections.delete(connectionId);

  if (!chatbotId) {
    await redis.del(connectionKey(connectionId));
    return;
  }

  await Promise.all([
    redis.srem(presenceSetKey(chatbotId), connectionId),
    redis.del(connectionKey(connectionId)),
  ]);

  await publishCurrentPresenceCount(chatbotId);
}

async function cleanupAllConnectionsBestEffort() {
  const ids = [...managedConnections];
  await Promise.allSettled(ids.map((connectionId) => cleanupConnection(connectionId)));
}

export function ensurePresenceShutdownHooks() {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;

  const runCleanup = () => {
    void cleanupAllConnectionsBestEffort();
  };

  process.once("SIGINT", runCleanup);
  process.once("SIGTERM", runCleanup);
  process.once("beforeExit", runCleanup);
}

export async function registerPresenceConnection(chatbotId: string, connectionId: string) {
  ensurePresenceShutdownHooks();

  connectionToChatbot.set(connectionId, chatbotId);
  managedConnections.add(connectionId);

  await Promise.all([
    redis.sadd(presenceSetKey(chatbotId), connectionId),
    redis.set(connectionKey(connectionId), chatbotId),
  ]);

  await publishCurrentPresenceCount(chatbotId);
}

export async function unregisterPresenceConnection(connectionId: string) {
  await cleanupConnection(connectionId);
}
