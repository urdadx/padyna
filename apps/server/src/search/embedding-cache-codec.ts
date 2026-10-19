/**
 * Cache keys ignore case and whitespace so "How do I reset?" and "how do i  reset?"
 * share one embedding. The text itself is hashed, keeping keys short and free of
 * visitor input.
 */
export function normalizeQueryForCache(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function embeddingCacheKey(model: string, dimensions: number, query: string) {
  const digest = new Bun.CryptoHasher("sha256").update(normalizeQueryForCache(query)).digest("hex");
  return `rag:query-embedding:${model}:${dimensions}:${digest}`;
}

/** Float32 + base64 is ~4x smaller than JSON for a 1536-dim vector. */
export function encodeEmbedding(embedding: number[]) {
  return Buffer.from(new Float32Array(embedding).buffer).toString("base64");
}

export function decodeEmbedding(value: string, dimensions: number): number[] | null {
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength !== dimensions * 4) {
    return null;
  }

  const floats = new Float32Array(bytes.buffer, bytes.byteOffset, dimensions);
  return Array.from(floats);
}
