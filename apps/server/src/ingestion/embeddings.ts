import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@padyna/env/server";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

function getEmbeddingModel() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return openai.embeddingModel(DEFAULT_EMBEDDING_MODEL);
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) {
    return {
      embeddings: [] as number[][],
      dimensions: 0,
    };
  }

  const model = getEmbeddingModel();

  const { embeddings } = await embedMany({
    model,
    values: texts,
  } as never);

  return {
    embeddings,
    dimensions: embeddings[0]?.length ?? 0,
  };
}

export { DEFAULT_EMBEDDING_MODEL };
