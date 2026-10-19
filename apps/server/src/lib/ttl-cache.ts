interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Small in-process LRU cache with per-entry expiry. Reads refresh recency; the
 * least recently used entry is evicted once `maxSize` is reached.
 */
export class TtlCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  constructor(
    private readonly options: { ttlMs: number; maxSize: number; now?: () => number },
  ) {}

  private now() {
    return this.options.now?.() ?? Date.now();
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    this.entries.delete(key);
    if (entry.expiresAt <= this.now()) {
      return undefined;
    }

    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs = this.options.ttlMs) {
    this.entries.delete(key);
    while (this.entries.size >= this.options.maxSize) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  delete(key: K) {
    this.entries.delete(key);
  }

  get size() {
    return this.entries.size;
  }
}
