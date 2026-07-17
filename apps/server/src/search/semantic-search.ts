import { EMBEDDING_MODEL, embedSearchQueryWithSignal } from "../lib/embeddings";

const QUERY_EMBEDDING_CACHE_TTL_MS = 15 * 60 * 1000;
const QUERY_EMBEDDING_CACHE_MAX_SIZE = 500;

interface CachedEmbedding {
  embedding: number[];
  expiresAt: number;
}

const queryEmbeddingCache = new Map<string, CachedEmbedding>();

export async function embedTextForSemanticSearch(
  text: string,
  abortSignal?: AbortSignal,
): Promise<number[]> {
  const cacheKey = `${EMBEDDING_MODEL}:${text}`;
  const cached = queryEmbeddingCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    queryEmbeddingCache.delete(cacheKey);
    queryEmbeddingCache.set(cacheKey, cached);
    return cached.embedding;
  }

  if (cached) {
    queryEmbeddingCache.delete(cacheKey);
  }

  const embedding = await embedSearchQueryWithSignal(text, abortSignal);

  if (queryEmbeddingCache.size >= QUERY_EMBEDDING_CACHE_MAX_SIZE) {
    const oldestKey = queryEmbeddingCache.keys().next().value;
    if (oldestKey) {
      queryEmbeddingCache.delete(oldestKey);
    }
  }

  queryEmbeddingCache.set(cacheKey, {
    embedding,
    expiresAt: Date.now() + QUERY_EMBEDDING_CACHE_TTL_MS,
  });

  return embedding;
}
