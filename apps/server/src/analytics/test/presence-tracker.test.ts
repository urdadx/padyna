import { describe, expect, test } from "bun:test";

import { createPresenceTracker, presenceKey, type RedisCommands } from "../presence-tracker";

/** The handful of sorted-set commands the tracker uses, in memory. */
function createFakeRedis() {
  const sets = new Map<string, Map<string, number>>();
  const commands: string[] = [];
  const set = (key: string) => {
    let entries = sets.get(key);
    if (!entries) sets.set(key, (entries = new Map()));
    return entries;
  };

  const redis: RedisCommands = {
    async send(command, args) {
      commands.push(command);
      const [key = "", ...rest] = args;
      switch (command) {
        case "ZADD":
          for (let i = 0; i < rest.length; i += 2) set(key).set(rest[i + 1]!, Number(rest[i]));
          return rest.length / 2;
        case "ZREM":
          for (const member of rest) set(key).delete(member);
          return rest.length;
        case "ZREMRANGEBYSCORE": {
          const max = Number(rest[1]);
          for (const [member, score] of set(key)) if (score <= max) set(key).delete(member);
          return 0;
        }
        case "ZCARD":
          return set(key).size;
        case "EXPIRE":
          return 1;
        default:
          throw new Error(`Unexpected command ${command}`);
      }
    },
  };

  return { redis, sets, commands };
}

function createClock(start = 1_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("presence tracker", () => {
  test("counts open connections per chatbot", async () => {
    const { redis } = createFakeRedis();
    const tracker = createPresenceTracker({ redis });

    await tracker.register("bot-a", "c1");
    await tracker.register("bot-a", "c2");
    await tracker.register("bot-b", "c3");
    await tracker.unregister("c1");

    expect(await tracker.count("bot-a")).toBe(1);
    expect(await tracker.count("bot-b")).toBe(1);
  });

  test("heartbeats keep long-lived connections counted", async () => {
    const { redis } = createFakeRedis();
    const clock = createClock();
    const tracker = createPresenceTracker({ redis, ttlMs: 45_000, now: clock.now });

    await tracker.register("bot-a", "c1");
    for (let i = 0; i < 10; i++) {
      clock.advance(15_000);
      await tracker.heartbeat();
    }

    expect(await tracker.count("bot-a")).toBe(1);
  });

  test("connections left by a crashed server age out", async () => {
    const { redis } = createFakeRedis();
    const clock = createClock();
    const crashed = createPresenceTracker({ redis, ttlMs: 45_000, now: clock.now });
    const alive = createPresenceTracker({ redis, ttlMs: 45_000, now: clock.now });

    await crashed.register("bot-a", "gone");
    await alive.register("bot-a", "here");
    clock.advance(30_000);
    await alive.heartbeat();
    clock.advance(30_000);

    expect(await alive.count("bot-a")).toBe(1);
  });

  test("a heartbeat writes one ZADD per chatbot, not per connection", async () => {
    const { redis, commands } = createFakeRedis();
    const tracker = createPresenceTracker({ redis });
    for (let i = 0; i < 50; i++) await tracker.register("bot-a", `c${i}`);
    commands.length = 0;

    await tracker.heartbeat();

    expect(commands.filter((command) => command === "ZADD")).toHaveLength(1);
  });

  test("unregistering during registration leaves no ghost entry", async () => {
    const { redis, sets } = createFakeRedis();
    const tracker = createPresenceTracker({ redis });

    const registering = tracker.register("bot-a", "c1");
    await tracker.unregister("c1");
    await registering;

    expect(sets.get(presenceKey("bot-a"))?.size ?? 0).toBe(0);
  });

  test("change notifications are throttled per chatbot", async () => {
    const { redis } = createFakeRedis();
    const notified: string[] = [];
    const tracker = createPresenceTracker({
      redis,
      notifyIntervalMs: 50,
      onChange: (chatbotId) => notified.push(chatbotId),
    });

    for (let i = 0; i < 20; i++) await tracker.register("bot-a", `c${i}`);
    await Bun.sleep(5);
    expect(notified).toEqual(["bot-a"]);

    await Bun.sleep(80);
    expect(notified).toEqual(["bot-a", "bot-a"]);
    await tracker.removeAll();
  });
});
