import { TtlCache } from "@/lib/ttl-cache";

// Every open analytics dashboard for a chatbot and time range wants the same
// overview whenever something changes. This shares one fetch between them:
// concurrent requests join the fetch in flight, results are reused briefly,
// and `invalidate` drops a chatbot's cached results when its data changes.

export function createOverviewLoader<T>(
  fetchOverview: (chatbotId: string, timeRange: string) => Promise<T>,
  options: { ttlMs?: number; maxSize?: number; now?: () => number } = {},
) {
  const cache = new TtlCache<string, T>({
    ttlMs: options.ttlMs ?? 5_000,
    maxSize: options.maxSize ?? 1_000,
    now: options.now,
  });
  const inFlight = new Map<string, Promise<T>>();
  // Bumped on invalidate, so a fetch that started before a change isn't cached.
  const versions = new Map<string, number>();
  const keyOf = (chatbotId: string, timeRange: string) => `${chatbotId}:${timeRange}`;

  return {
    load(chatbotId: string, timeRange: string): Promise<T> {
      const key = keyOf(chatbotId, timeRange);
      const cached = cache.get(key);
      if (cached !== undefined) return Promise.resolve(cached);

      const pending = inFlight.get(key);
      if (pending) return pending;

      const version = versions.get(chatbotId) ?? 0;
      const request = fetchOverview(chatbotId, timeRange)
        .then((value) => {
          if ((versions.get(chatbotId) ?? 0) === version) cache.set(key, value);
          return value;
        })
        .finally(() => {
          if (inFlight.get(key) === request) inFlight.delete(key);
        });
      inFlight.set(key, request);
      return request;
    },

    /** Forgets a chatbot's cached overviews; the next load fetches afresh. */
    invalidate(chatbotId: string, timeRanges: readonly string[]) {
      versions.set(chatbotId, (versions.get(chatbotId) ?? 0) + 1);
      for (const timeRange of timeRanges) {
        const key = keyOf(chatbotId, timeRange);
        cache.delete(key);
        inFlight.delete(key);
      }
    },
  };
}
