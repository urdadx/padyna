import { openai } from "@ai-sdk/openai";
import { cosineSimilarity, embed } from "ai";
import { env } from "@padyna/env/server";

export interface RankedSemanticChunk {
  chunkId: string;
  score: number;
}

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

function getEmbeddingModel() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return openai.embeddingModel(DEFAULT_EMBEDDING_MODEL);
}

export async function embedTextForSemanticSearch(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const { embedding } = await embed({
    model,
    value: text,
  } as never);

  return embedding;
}

export async function rankSemanticChunksFromText(
  query: string,
  candidates: Array<{ chunkId: string; content: string }>,
  limit = 8,
): Promise<RankedSemanticChunk[]> {
  const queryEmbedding = await embedTextForSemanticSearch(query);

  const embeddedCandidates = await Promise.all(
    candidates.map(async (candidate) => ({
      chunkId: candidate.chunkId,
      embedding: await embedTextForSemanticSearch(candidate.content),
    })),
  );

  return rankSemanticChunks(queryEmbedding, embeddedCandidates, limit);
}

export function rankSemanticChunks(
  queryEmbedding: number[],
  candidates: Array<{ chunkId: string; embedding: number[] }>,
  limit = 8,
): RankedSemanticChunk[] {
  return candidates
    .map((candidate) => ({
      chunkId: candidate.chunkId,
      score: Number(cosineSimilarity(queryEmbedding, candidate.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
