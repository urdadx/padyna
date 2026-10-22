import { describe, expect, test } from "bun:test";

import {
  MAX_SESSION_DURATION_MS,
  chartBucketUnit,
  clampDurationMs,
  computeBounceRate,
  getDateRange,
  splitBreakdowns,
  type BreakdownRow,
} from "../analytics-utils";

describe("analytics helpers", () => {
  test("date ranges end now and span the requested window", () => {
    const now = new Date("2026-10-22T12:00:00Z");

    expect(getDateRange("24h", now).start.toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(getDateRange("90d", now).start.toISOString()).toBe("2026-07-24T12:00:00.000Z");
    expect(getDateRange("7d", now).end).toBe(now);
  });

  test("the last 24 hours are charted by hour, longer ranges by day", () => {
    expect(chartBucketUnit("24h")).toBe("hour");
    expect(chartBucketUnit("7d")).toBe("day");
    expect(chartBucketUnit("90d")).toBe("day");
  });

  test("client durations are rounded and kept within 0..24h", () => {
    expect(clampDurationMs(1234.6)).toBe(1235);
    expect(clampDurationMs("5000")).toBe(5000);
    expect(clampDurationMs(-50)).toBe(0);
    expect(clampDurationMs(9e12)).toBe(MAX_SESSION_DURATION_MS);
    expect(clampDurationMs("abc")).toBeUndefined();
    expect(clampDurationMs("")).toBeUndefined();
    expect(clampDurationMs(Number.NaN)).toBeUndefined();
    expect(clampDurationMs(undefined)).toBeUndefined();
  });

  test("bounce rate is the share of visits without a chat, never below 0", () => {
    expect(computeBounceRate(4, 2)).toBe(0.5);
    expect(computeBounceRate(0, 0)).toBe(0);
    // More sessions with chats than visits in range (chats from earlier sessions).
    expect(computeBounceRate(2, 5)).toBe(0);
  });

  test("grouped rows split into each dimension's top values", () => {
    const rows: BreakdownRow[] = [
      { dimension: "country", key: "US", label: "United States", count: "5" },
      { dimension: "country", key: null, label: null, count: "1" },
      { dimension: "country", key: "GB", label: "United Kingdom", count: "3" },
      { dimension: "device", key: "mobile", label: null, count: 2 },
      { dimension: "os", key: "iOS", label: null, count: 2 },
      { dimension: "referrer", key: null, label: null, count: 4 },
    ];

    const result = splitBreakdowns(rows, 2);

    expect(result.countries).toEqual([
      { countryCode: "US", country: "United States", value: 5 },
      { countryCode: "GB", country: "United Kingdom", value: 3 },
    ]);
    expect(result.devices).toEqual([{ deviceType: "mobile", count: 2 }]);
    expect(result.os).toEqual([{ os: "iOS", count: 2 }]);
    expect(result.referrers).toEqual([{ referrer: "direct", value: 4 }]);
  });
});
