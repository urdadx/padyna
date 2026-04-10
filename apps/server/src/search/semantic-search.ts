import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { env } from "@padyna/env/server";

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
