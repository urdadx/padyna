import { getPgPool } from "@padyna/db";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embedDocuments } from "../lib/embeddings";
import { chunkEmbeddingInput, mergeEmbeddings, planEmbeddingReuse } from "./embedding-reuse";

async function loadExistingEmbeddings(datasourceId: string) {
  const { rows } = await getPgPool().query<{ title: string | null; content: string; embedding: string }>(
    `
      select title, content, embedding::text as embedding
      from datasource_chunks
      where datasource_id = $1
        and embedding is not null
        and embedding_model = $2
        and embedding_dimensions = $3
    `,
    [datasourceId, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS],
  );

  return new Map(
    rows.map((row) => [
      chunkEmbeddingInput(row.title, row.content),
      row.embedding.slice(1, -1).split(",").map(Number),
    ]),
  );
}

/**
 * Embeds chunk texts. With `reuseFromDatasourceId`, chunks whose text is unchanged
 * since the datasource's last sync keep their stored embedding, so editing one
 * paragraph or re-syncing a page only pays for the chunks that changed.
 */
export async function embedTexts(texts: string[], options: { reuseFromDatasourceId?: string } = {}) {
  if (texts.length === 0) {
    return {
      embeddings: [] as number[][],
      dimensions: 0,
      model: EMBEDDING_MODEL,
      reusedCount: 0,
    };
  }

  const existing = options.reuseFromDatasourceId
    ? await loadExistingEmbeddings(options.reuseFromDatasourceId).catch((error) => {
        console.warn("Could not load existing embeddings; embedding all chunks", error);
        return new Map<string, number[]>();
      })
    : new Map<string, number[]>();

  const { embeddings: planned, missingIndexes } = planEmbeddingReuse(texts, existing);
  const fresh = await embedDocuments(missingIndexes.map((index) => texts[index]!));

  return {
    embeddings: mergeEmbeddings(planned, missingIndexes, fresh),
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    reusedCount: texts.length - missingIndexes.length,
  };
}

export { EMBEDDING_MODEL as DEFAULT_EMBEDDING_MODEL };
