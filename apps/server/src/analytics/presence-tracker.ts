// Live visitor counts per chatbot, shared across server instances through
// Redis. Each chatbot has a sorted set of open widget connections scored by
// when this server last saw them; a heartbeat re-scores the connections it
// holds, so entries left by a crashed instance age out after `ttlMs`.

export type RedisCommands = {
  send(command: string, args: string[]): Promise<unknown>;
};

type PresenceTrackerOptions = {
  redis: RedisCommands;
  /** A connection is counted while its last heartbeat is newer than this. */
  ttlMs?: number;
  /** Called with the new count, at most once per `notifyIntervalMs` per chatbot. */
  onChange?: (chatbotId: string, count: number) => void;
  notifyIntervalMs?: number;
  now?: () => number;
  logError?: (message: string, error: unknown) => void;
};

export function presenceKey(chatbotId: string) {
  return `presence:live:${chatbotId}`;
}

export function createPresenceTracker(options: PresenceTrackerOptions) {
  const { redis } = options;
  const ttlMs = options.ttlMs ?? 45_000;
  const notifyIntervalMs = options.notifyIntervalMs ?? 1_000;
  const now = options.now ?? Date.now;
  const logError = options.logError ?? ((message, error) => console.error(message, error));

  // Connections held by this server, grouped by chatbot for batched heartbeats.
  const connectionChatbot = new Map<string, string>();
  const chatbotConnections = new Map<string, Set<string>>();
  // Per-chatbot notification throttle: last send time and a pending trailing call.
  const lastNotifiedAt = new Map<string, number>();
  const pendingNotify = new Map<string, ReturnType<typeof setTimeout>>();

  const keyTtlSeconds = String(Math.ceil((ttlMs * 2) / 1000));

  async function count(chatbotId: string): Promise<number> {
    const key = presenceKey(chatbotId);
    await redis.send("ZREMRANGEBYSCORE", [key, "-inf", String(now() - ttlMs)]);
    return Number((await redis.send("ZCARD", [key])) ?? 0);
  }

  async function notify(chatbotId: string) {
    if (!options.onChange) return;
    try {
      options.onChange(chatbotId, await count(chatbotId));
    } catch (error) {
      logError("[presence] count failed", error);
    }
  }

  /** Leading call right away, then at most one trailing call per interval. */
  function scheduleNotify(chatbotId: string) {
    if (!options.onChange || pendingNotify.has(chatbotId)) return;
    const elapsed = now() - (lastNotifiedAt.get(chatbotId) ?? Number.NEGATIVE_INFINITY);
    const delay = Math.max(0, notifyIntervalMs - elapsed);
    if (delay === 0) {
      lastNotifiedAt.set(chatbotId, now());
      void notify(chatbotId);
      return;
    }
    pendingNotify.set(
      chatbotId,
      setTimeout(() => {
        pendingNotify.delete(chatbotId);
        lastNotifiedAt.set(chatbotId, now());
        void notify(chatbotId);
      }, delay),
    );
  }

  async function touch(chatbotId: string, connectionIds: string[]) {
    const key = presenceKey(chatbotId);
    const score = String(now());
    await redis.send("ZADD", [key, ...connectionIds.flatMap((id) => [score, id])]);
    await redis.send("EXPIRE", [key, keyTtlSeconds]);
  }

  return {
    count,

    async register(chatbotId: string, connectionId: string) {
      connectionChatbot.set(connectionId, chatbotId);
      let set = chatbotConnections.get(chatbotId);
      if (!set) chatbotConnections.set(chatbotId, (set = new Set()));
      set.add(connectionId);

      await touch(chatbotId, [connectionId]);
      // Unregistered while the write was in flight: undo it rather than leave
      // a ghost entry until it ages out.
      if (connectionChatbot.get(connectionId) !== chatbotId) {
        await redis.send("ZREM", [presenceKey(chatbotId), connectionId]);
      }
      scheduleNotify(chatbotId);
    },

    async unregister(connectionId: string) {
      const chatbotId = connectionChatbot.get(connectionId);
      if (!chatbotId) return;
      connectionChatbot.delete(connectionId);
      const set = chatbotConnections.get(chatbotId);
      set?.delete(connectionId);
      if (set?.size === 0) chatbotConnections.delete(chatbotId);

      await redis.send("ZREM", [presenceKey(chatbotId), connectionId]);
      scheduleNotify(chatbotId);
    },

    /** Re-scores every connection this server holds: one ZADD per chatbot. */
    async heartbeat() {
      await Promise.allSettled(
        [...chatbotConnections].map(([chatbotId, ids]) =>
          touch(chatbotId, [...ids]).catch((error) => logError("[presence] heartbeat failed", error)),
        ),
      );
    },

    /** Removes this server's connections, e.g. on shutdown. */
    async removeAll() {
      for (const timer of pendingNotify.values()) clearTimeout(timer);
      pendingNotify.clear();
      await Promise.allSettled(
        [...chatbotConnections].map(([chatbotId, ids]) =>
          redis.send("ZREM", [presenceKey(chatbotId), ...ids]),
        ),
      );
      connectionChatbot.clear();
      chatbotConnections.clear();
    },

    /** Connections this server holds, for tests and diagnostics. */
    localConnectionCount() {
      return connectionChatbot.size;
    },
  };
}

export type PresenceTracker = ReturnType<typeof createPresenceTracker>;
