/** The text each chunk is embedded as. Every ingestion path uses this shape. */
export function chunkEmbeddingInput(title: string | null, content: string) {
  return `${title ?? ""}\n\n${content}`;
}

/**
 * Splits texts into ones whose embedding already exists (from a previous sync of the
 * same datasource) and ones that still need an embedding call.
 */
export function planEmbeddingReuse(texts: string[], existing: Map<string, number[]>) {
  const embeddings: Array<number[] | null> = texts.map((text) => existing.get(text) ?? null);
  const missingIndexes = embeddings.flatMap((embedding, index) => (embedding ? [] : [index]));
  return { embeddings, missingIndexes };
}

export function mergeEmbeddings(
  planned: Array<number[] | null>,
  missingIndexes: number[],
  fresh: number[][],
): number[][] {
  const merged = [...planned];
  missingIndexes.forEach((textIndex, freshIndex) => {
    merged[textIndex] = fresh[freshIndex] ?? null;
  });

  if (merged.some((embedding) => embedding === null)) {
    throw new Error("Missing embedding after merging reused and new vectors.");
  }
  return merged as number[][];
}
