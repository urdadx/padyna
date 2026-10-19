import { describe, expect, test } from "bun:test";

import {
  decodeEmbedding,
  embeddingCacheKey,
  encodeEmbedding,
  normalizeQueryForCache,
} from "../embedding-cache-codec";

describe("normalizeQueryForCache", () => {
  test("ignores case and extra whitespace", () => {
    expect(normalizeQueryForCache("  How do I   Reset\nmy password? ")).toBe(
      "how do i reset my password?",
    );
  });
});

describe("embeddingCacheKey", () => {
  test("is equal for equivalent queries and scoped by model and size", () => {
    const a = embeddingCacheKey("m", 1536, "Reset password");
    expect(embeddingCacheKey("m", 1536, "  reset   PASSWORD")).toBe(a);
    expect(embeddingCacheKey("m", 512, "Reset password")).not.toBe(a);
    expect(embeddingCacheKey("other", 1536, "Reset password")).not.toBe(a);
    expect(a).not.toContain("Reset");
  });
});

describe("embedding codec", () => {
  test("round-trips through float32 precision", () => {
    const embedding = [0.1, -0.25, 0.5, 1];
    const decoded = decodeEmbedding(encodeEmbedding(embedding), 4);
    expect(decoded).toHaveLength(4);
    decoded!.forEach((value, index) => expect(value).toBeCloseTo(embedding[index]!, 6));
  });

  test("rejects values of the wrong size", () => {
    expect(decodeEmbedding(encodeEmbedding([1, 2, 3]), 4)).toBeNull();
    expect(decodeEmbedding("", 4)).toBeNull();
  });
});
