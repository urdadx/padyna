import { describe, expect, test } from "bun:test";

import { createOverviewLoader } from "../overview-loader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("overview loader", () => {
  test("dashboards asking at the same time share one fetch", async () => {
    let fetches = 0;
    const loader = createOverviewLoader(async () => ++fetches);

    const results = await Promise.all([loader.load("bot", "7d"), loader.load("bot", "7d"), loader.load("bot", "7d")]);

    expect(results).toEqual([1, 1, 1]);
    expect(fetches).toBe(1);
  });

  test("results are reused until they expire", async () => {
    let time = 0;
    let fetches = 0;
    const loader = createOverviewLoader(async () => ++fetches, { ttlMs: 100, now: () => time });

    await loader.load("bot", "7d");
    time = 99;
    expect(await loader.load("bot", "7d")).toBe(1);
    time = 100;
    expect(await loader.load("bot", "7d")).toBe(2);
  });

  test("ranges and chatbots are cached separately", async () => {
    const loader = createOverviewLoader(async (chatbotId, range) => `${chatbotId}:${range}`);

    expect(await loader.load("a", "7d")).toBe("a:7d");
    expect(await loader.load("a", "30d")).toBe("a:30d");
    expect(await loader.load("b", "7d")).toBe("b:7d");
  });

  test("invalidating fetches fresh data and never caches a fetch that predates it", async () => {
    const first = deferred<string>();
    let calls = 0;
    const loader = createOverviewLoader(async () => (++calls === 1 ? first.promise : "fresh"));

    const stale = loader.load("bot", "7d");
    loader.invalidate("bot", ["7d"]);
    first.resolve("stale");

    expect(await stale).toBe("stale");
    expect(await loader.load("bot", "7d")).toBe("fresh");
    expect(await loader.load("bot", "7d")).toBe("fresh");
    expect(calls).toBe(2);
  });

  test("a failed fetch isn't cached", async () => {
    let calls = 0;
    const loader = createOverviewLoader(async () => {
      if (++calls === 1) throw new Error("database down");
      return "ok";
    });

    await expect(loader.load("bot", "7d")).rejects.toThrow("database down");
    expect(await loader.load("bot", "7d")).toBe("ok");
  });
});
