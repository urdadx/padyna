import { redis } from "../lib/redis";
import { TtlCache } from "../lib/ttl-cache";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embedSearchQueryWithSignal } from "../lib/embeddings";
import { decodeEmbedding, embeddingCacheKey, encodeEmbedding } from "./embedding-cache-codec";

// Query embeddings are deterministic, so they can be cached for a long time. The
// in-process cache saves the Redis round trip for hot queries; Redis shares hits
// across server instances and restarts.
const MEMORY_TTL_MS = 15 * 60 * 1000;
const MEMORY_MAX_SIZE = 500;
const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60;

const memoryCache = new TtlCache<string, number[]>({
  ttlMs: MEMORY_TTL_MS,
  maxSize: MEMORY_MAX_SIZE,
});

async function readRedis(key: string) {
  try {
    const value = await redis.get(key);
    return value ? decodeEmbedding(value, EMBEDDING_DIMENSIONS) : null;
  } catch (error) {
    console.warn("Query embedding cache read failed", error);
    return null;
  }
}

function writeRedis(key: string, embedding: number[]) {
  void redis
    .set(key, encodeEmbedding(embedding), "EX", REDIS_TTL_SECONDS)
    .catch((error: unknown) => console.warn("Query embedding cache write failed", error));
}

export async function embedTextForSemanticSearch(
  text: string,
  abortSignal?: AbortSignal,
): Promise<number[]> {
  const key = embeddingCacheKey(EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, text);

  const cached = memoryCache.get(key) ?? (await readRedis(key));
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }

  const embedding = await embedSearchQueryWithSignal(text, abortSignal);
  memoryCache.set(key, embedding);
  writeRedis(key, embedding);
  return embedding;
}
