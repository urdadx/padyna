import { RedisClient } from "bun";
import { analyticsEvents } from "@padyna/api/lib/events";
import { env } from "@padyna/env/server";

type LiveCountUpdatePayload = {
  chatbotId: string;
  count: number;
  updatedAt: string;
};

type PresenceConnectionPayload = {
  chatbotId: string;
  lastSeenAt: string;
};

const redisUrl = env.REDIS_URL ?? "redis://localhost:6379";
const PRESENCE_TTL_SECONDS = 45;

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

function serializeConnectionPayload(chatbotId: string): string {
  const payload: PresenceConnectionPayload = {
    chatbotId,
    lastSeenAt: new Date().toISOString(),
  };

  return JSON.stringify(payload);
}

function parseConnectionPayload(value: string | null): PresenceConnectionPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PresenceConnectionPayload>;

    if (typeof parsed.chatbotId !== "string" || typeof parsed.lastSeenAt !== "string") {
      return null;
    }

    return {
      chatbotId: parsed.chatbotId,
      lastSeenAt: parsed.lastSeenAt,
    };
  } catch {
    return null;
  }
}

async function writePresenceConnection(chatbotId: string, connectionId: string) {
  await Promise.all([
    redis.sadd(presenceSetKey(chatbotId), connectionId),
    redis.set(connectionKey(connectionId), serializeConnectionPayload(chatbotId)),
  ]);

  await redis.expire(connectionKey(connectionId), PRESENCE_TTL_SECONDS);
}

async function pruneStalePresenceConnections(chatbotId: string): Promise<number> {
  const connectionIds = (await redis.smembers(presenceSetKey(chatbotId))) ?? [];

  if (connectionIds.length === 0) {
    return 0;
  }

  const now = Date.now();
  const entries = await Promise.all(
    connectionIds.map(async (connectionId) => {
      const key = connectionKey(connectionId);
      const rawValue = await redis.get(key);
      const payload = parseConnectionPayload(rawValue);
      const lastSeenAt = payload ? Date.parse(payload.lastSeenAt) : Number.NaN;
      const isExpired = !Number.isFinite(lastSeenAt) || now - lastSeenAt > PRESENCE_TTL_SECONDS * 1000;
      const isStale = !payload || payload.chatbotId !== chatbotId || isExpired;

      return { connectionId, key, isStale };
    }),
  );

  const staleEntries = entries.filter((entry) => entry.isStale);

  if (staleEntries.length > 0) {
    await Promise.allSettled([
      ...staleEntries.map((entry) => redis.srem(presenceSetKey(chatbotId), entry.connectionId)),
      ...staleEntries.map((entry) => redis.del(entry.key)),
    ]);
  }

  return connectionIds.length - staleEntries.length;
}

async function resolveConnectionChatbotId(connectionId: string): Promise<string | null> {
  const mappedChatbotId = connectionToChatbot.get(connectionId);

  if (mappedChatbotId) {
    return mappedChatbotId;
  }

  const storedValue = await redis.get(connectionKey(connectionId));
  const payload = parseConnectionPayload(storedValue);

  if (payload?.chatbotId) {
    return payload.chatbotId;
  }

  return storedValue ?? null;
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
  return pruneStalePresenceConnections(chatbotId);
}

async function publishCurrentPresenceCount(chatbotId: string): Promise<number> {
  const count = await getLivePresenceCount(chatbotId);
  await publishPresenceCount(chatbotId, count);
  analyticsEvents.emit("analytics-update", { chatbotId, action: "presence-update" });
  return count;
}

async function cleanupConnection(connectionId: string) {
  const chatbotId = await resolveConnectionChatbotId(connectionId);

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

  await writePresenceConnection(chatbotId, connectionId);

  await publishCurrentPresenceCount(chatbotId);
}

export async function refreshPresenceConnection(chatbotId: string, connectionId: string) {
  connectionToChatbot.set(connectionId, chatbotId);
  managedConnections.add(connectionId);

  await writePresenceConnection(chatbotId, connectionId);
}

export async function unregisterPresenceConnection(connectionId: string) {
  await cleanupConnection(connectionId);
}
