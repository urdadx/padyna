import { openai, type OpenAIEmbeddingModelOptions } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { env } from "@padyna/env/server";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

const EMBEDDING_TIMEOUT_MS = 15_000;
const INGESTION_EMBEDDING_TIMEOUT_MS = 60_000;
const MAX_PARALLEL_EMBEDDING_CALLS = 2;

const providerOptions = {
  openai: {
    dimensions: EMBEDDING_DIMENSIONS,
  } satisfies OpenAIEmbeddingModelOptions,
};

function getEmbeddingModel() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return openai.embedding(EMBEDDING_MODEL);
}

function validateEmbedding(embedding: number[], index?: number) {
  const label = index === undefined ? "Embedding" : `Embedding at index ${index}`;

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `${label} has ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }

  if (!embedding.every(Number.isFinite)) {
    throw new Error(`${label} contains a non-finite value.`);
  }
}

export async function embedSearchQueryWithSignal(
  value: string,
  abortSignal?: AbortSignal,
): Promise<number[]> {
  const timeoutSignal = AbortSignal.timeout(EMBEDDING_TIMEOUT_MS);
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value,
    providerOptions,
    abortSignal: abortSignal ? AbortSignal.any([abortSignal, timeoutSignal]) : timeoutSignal,
  });

  validateEmbedding(embedding);
  return embedding;
}

export async function embedDocuments(values: string[]): Promise<number[][]> {
  if (values.length === 0) {
    return [];
  }

  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values,
    providerOptions,
    maxParallelCalls: MAX_PARALLEL_EMBEDDING_CALLS,
    abortSignal: AbortSignal.timeout(INGESTION_EMBEDDING_TIMEOUT_MS),
  });

  if (embeddings.length !== values.length) {
    throw new Error(
      `Embedding provider returned ${embeddings.length} vectors for ${values.length} values.`,
    );
  }

  embeddings.forEach(validateEmbedding);
  return embeddings;
}
