import { describe, expect, test } from "bun:test";

import type { FusionOptions, RankedRetrievalCandidate } from "./hybrid-retrieval";

Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000",
  POLAR_ACCESS_TOKEN: "test-polar-access-token",
  POLAR_WEBHOOK_SECRET: "test-polar-webhook-secret",
  POLAR_SUCCESS_URL: "http://localhost:3000/success",
  CORS_ORIGIN: "http://localhost:3000",
  NODE_ENV: "test",
  POLAR_API_URL: "https://sandbox-api.polar.sh",
  REDIS_URL: "redis://localhost:6379",
});

const { fuseRetrievalCandidates } = await import("./hybrid-retrieval");

const defaultOptions: FusionOptions = {
  limit: 8,
  maxChunksPerDatasource: 8,
  rrfK: 60,
  semanticWeight: 1,
  fullTextWeight: 1,
};

function candidate(
  chunkId: string,
  rank: number,
  overrides: Partial<RankedRetrievalCandidate> = {},
): RankedRetrievalCandidate {
  return {
    chunkId,
    datasourceId: `datasource-${chunkId}`,
    content: `Content for ${chunkId}`,
    contentHash: `hash-${chunkId}`,
    chunkIndex: 0,
    sourceName: `Source ${chunkId}`,
    sourceType: "text",
    url: null,
    score: 1,
    rank,
    ...overrides,
  };
}

describe("fuseRetrievalCandidates", () => {
  test("boosts candidates found by both modalities with reciprocal rank fusion", () => {
    const semantic = [candidate("semantic-only", 1), candidate("overlap", 2)];
    const fullText = [candidate("full-text-only", 1), candidate("overlap", 2)];

    const results = fuseRetrievalCandidates(semantic, fullText, defaultOptions);

    expect(results.map((result) => result.chunkId)).toEqual([
      "overlap",
      "semantic-only",
      "full-text-only",
    ]);
    expect(results[0]?.fusedScore).toBeCloseTo(2 / 62);
    expect(results[0]?.semanticRank).toBe(2);
    expect(results[0]?.fullTextRank).toBe(2);
  });

  test("orders exact score ties deterministically by chunk ID", () => {
    const semantic = [candidate("chunk-b", 1), candidate("chunk-a", 1)];

    const first = fuseRetrievalCandidates(semantic, [], defaultOptions);
    const second = fuseRetrievalCandidates([...semantic].reverse(), [], defaultOptions);

    expect(first.map((result) => result.chunkId)).toEqual(["chunk-a", "chunk-b"]);
    expect(second.map((result) => result.chunkId)).toEqual(["chunk-a", "chunk-b"]);
  });

  test("removes duplicate normalized content when hashes are unavailable", () => {
    const semantic = [
      candidate("preferred", 1, { content: "Shared   content", contentHash: null }),
      candidate("duplicate", 2, { content: " Shared content ", contentHash: null }),
      candidate("unique", 3, { content: "Unique content", contentHash: null }),
    ];

    const results = fuseRetrievalCandidates(semantic, [], defaultOptions);

    expect(results.map((result) => result.chunkId)).toEqual(["preferred", "unique"]);
  });

  test("caps chunks returned from each datasource", () => {
    const semantic = [
      candidate("source-a-1", 1, { datasourceId: "source-a" }),
      candidate("source-a-2", 2, { datasourceId: "source-a" }),
      candidate("source-b-1", 3, { datasourceId: "source-b" }),
    ];

    const results = fuseRetrievalCandidates(semantic, [], {
      ...defaultOptions,
      maxChunksPerDatasource: 1,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["source-a-1", "source-b-1"]);
  });

  test("applies semantic and full-text modality weights", () => {
    const semantic = [candidate("semantic", 1)];
    const fullText = [candidate("full-text", 1)];

    const results = fuseRetrievalCandidates(semantic, fullText, {
      ...defaultOptions,
      semanticWeight: 1,
      fullTextWeight: 3,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["full-text", "semantic"]);
    expect(results[0]?.fusedScore).toBeCloseTo(3 / 61);
    expect(results[1]?.fusedScore).toBeCloseTo(1 / 61);
  });

  test("limits the final result set", () => {
    const semantic = [candidate("one", 1), candidate("two", 2), candidate("three", 3)];

    const results = fuseRetrievalCandidates(semantic, [], {
      ...defaultOptions,
      limit: 2,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["one", "two"]);
  });
});
