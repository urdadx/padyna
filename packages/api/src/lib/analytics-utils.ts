// Pure analytics helpers (no database), shared by the API and the server.

export const TIME_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

/** Longest session duration accepted from a client (24 hours). */
export const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const RANGE_MS: Record<TimeRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export function getDateRange(timeRange: TimeRange, now = new Date()) {
  return { start: new Date(now.getTime() - RANGE_MS[timeRange]), end: now };
}

/** The last 24 hours are charted by hour, longer ranges by day. */
export function chartBucketUnit(timeRange: TimeRange): "hour" | "day" {
  return timeRange === "24h" ? "hour" : "day";
}

/** Rounds a client-reported duration into 0..24h; anything unusable becomes undefined. */
export function clampDurationMs(value: unknown): number | undefined {
  const ms = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof ms !== "number" || !Number.isFinite(ms)) return undefined;
  return Math.round(Math.min(Math.max(ms, 0), MAX_SESSION_DURATION_MS));
}

/** Share of visits (0..1) that never started a chat. */
export function computeBounceRate(totalVisits: number, sessionsWithChat: number): number {
  if (totalVisits <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - sessionsWithChat / totalVisits));
}

const n = (value: unknown) => Number(value ?? 0);

export type Breakdowns = {
  countries: { countryCode: string; country: string; value: number }[];
  devices: { deviceType: string; count: number }[];
  os: { os: string; count: number }[];
  referrers: { referrer: string; value: number }[];
};

export type BreakdownRow = {
  dimension: "country" | "device" | "os" | "referrer";
  key: string | null;
  label: string | null;
  count: number | string;
};

/** Splits grouped rows into the top `limit` values of each dimension. */
export function splitBreakdowns(rows: BreakdownRow[], limit: number): Breakdowns {
  const top = (dimension: BreakdownRow["dimension"]) =>
    rows
      .filter((row) => row.dimension === dimension)
      .sort((a, b) => n(b.count) - n(a.count))
      .slice(0, limit);

  return {
    countries: top("country").map((row) => ({
      countryCode: row.key ?? "unknown",
      country: row.label ?? "Unknown",
      value: n(row.count),
    })),
    devices: top("device").map((row) => ({ deviceType: row.key ?? "unknown", count: n(row.count) })),
    os: top("os").map((row) => ({ os: row.key ?? "unknown", count: n(row.count) })),
    referrers: top("referrer").map((row) => ({ referrer: row.key ?? "direct", value: n(row.count) })),
  };
}
