import { describe, expect, test } from "bun:test";

import { mapWithConcurrency, toBatches } from "../concurrency";

describe("mapWithConcurrency", () => {
  test("keeps input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapWithConcurrency([30, 10, 20, 5, 15], 2, async (delay, index) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Bun.sleep(delay);
      inFlight--;
      return index * 10;
    });

    expect(results).toEqual([0, 10, 20, 30, 40]);
    expect(maxInFlight).toBe(2);
  });

  test("handles empty input and propagates errors", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
    await expect(
      mapWithConcurrency([1, 2], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});

describe("toBatches", () => {
  test("splits into fixed-size batches", () => {
    expect(toBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(toBatches([], 3)).toEqual([]);
  });
});
