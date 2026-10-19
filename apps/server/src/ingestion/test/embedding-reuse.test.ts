import { describe, expect, test } from "bun:test";

import { chunkEmbeddingInput, mergeEmbeddings, planEmbeddingReuse } from "../embedding-reuse";

describe("chunkEmbeddingInput", () => {
  test("matches the title + content shape used at ingestion", () => {
    expect(chunkEmbeddingInput("Pricing", "Plans start at $10.")).toBe("Pricing\n\nPlans start at $10.");
    expect(chunkEmbeddingInput(null, "x")).toBe("\n\nx");
  });
});

describe("planEmbeddingReuse", () => {
  test("reuses unchanged texts and lists the rest", () => {
    const existing = new Map([["a", [1]], ["c", [3]]]);
    const plan = planEmbeddingReuse(["a", "b", "c", "d"], existing);

    expect(plan.embeddings).toEqual([[1], null, [3], null]);
    expect(plan.missingIndexes).toEqual([1, 3]);
  });

  test("embeds everything when nothing matches", () => {
    expect(planEmbeddingReuse(["x"], new Map()).missingIndexes).toEqual([0]);
  });
});

describe("mergeEmbeddings", () => {
  test("puts fresh vectors back in their original positions", () => {
    expect(mergeEmbeddings([[1], null, [3], null], [1, 3], [[2], [4]])).toEqual([[1], [2], [3], [4]]);
  });

  test("throws if a vector is missing", () => {
    expect(() => mergeEmbeddings([null, null], [0, 1], [[1]])).toThrow();
  });
});
