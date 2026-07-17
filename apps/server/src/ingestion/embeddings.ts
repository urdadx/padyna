import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embedDocuments } from "../lib/embeddings";

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) {
    return {
      embeddings: [] as number[][],
      dimensions: 0,
      model: EMBEDDING_MODEL,
    };
  }

  const embeddings = await embedDocuments(texts);

  return {
    embeddings,
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
  };
}

export { EMBEDDING_MODEL as DEFAULT_EMBEDDING_MODEL };
