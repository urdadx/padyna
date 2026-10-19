import { openai, type OpenAIEmbeddingModelOptions } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { env } from "@padyna/env/server";
import { mapWithConcurrency, toBatches } from "./concurrency";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

const EMBEDDING_TIMEOUT_MS = 15_000;
const INGESTION_EMBEDDING_TIMEOUT_MS = 60_000;
// Batches stay well under OpenAI's per-request token cap (~300 tokens per chunk), and
// each gets its own timeout so a large document isn't racing one 60s budget.
const EMBEDDING_BATCH_SIZE = 256;
const MAX_PARALLEL_EMBEDDING_CALLS = 4;

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

  const batches = await mapWithConcurrency(
    toBatches(values, EMBEDDING_BATCH_SIZE),
    MAX_PARALLEL_EMBEDDING_CALLS,
    async (batch) => {
      const { embeddings } = await embedMany({
        model: getEmbeddingModel(),
        values: batch,
        providerOptions,
        maxParallelCalls: 1,
        abortSignal: AbortSignal.timeout(INGESTION_EMBEDDING_TIMEOUT_MS),
      });
      return embeddings;
    },
  );
  const embeddings = batches.flat();

  if (embeddings.length !== values.length) {
    throw new Error(
      `Embedding provider returned ${embeddings.length} vectors for ${values.length} values.`,
    );
  }

  embeddings.forEach(validateEmbedding);
  return embeddings;
}
