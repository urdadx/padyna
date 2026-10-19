import { describe, expect, test } from "bun:test";

import { TtlCache } from "../ttl-cache";

function createClock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("TtlCache", () => {
  test("returns values until they expire", () => {
    const clock = createClock();
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxSize: 10, now: clock.now });

    cache.set("a", 1);
    clock.advance(99);
    expect(cache.get("a")).toBe(1);
    clock.advance(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  test("evicts the least recently used entry when full", () => {
    const cache = new TtlCache<string, number>({ ttlMs: 1_000, maxSize: 2 });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // "b" is now least recently used
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  test("supports per-entry ttl and delete", () => {
    const clock = createClock();
    const cache = new TtlCache<string, string>({ ttlMs: 1_000, maxSize: 5, now: clock.now });

    cache.set("short", "x", 10);
    cache.set("gone", "y");
    cache.delete("gone");
    clock.advance(10);

    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("gone")).toBeUndefined();
  });
});
