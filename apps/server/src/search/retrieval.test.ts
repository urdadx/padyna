import { describe, expect, test } from "bun:test";

import type { RankedRetrievalCandidate, SelectionOptions } from "./retrieval";

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

const { selectRetrievalCandidates } = await import("./retrieval");

const defaultOptions: SelectionOptions = {
  limit: 8,
  maxChunksPerDatasource: 8,
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

describe("selectRetrievalCandidates", () => {
  test("keeps candidates in rank order and labels where they matched", () => {
    const fullText = [candidate("second", 2), candidate("first", 1)];

    const results = selectRetrievalCandidates(fullText, "full_text", defaultOptions);

    expect(results.map((result) => result.chunkId)).toEqual(["first", "second"]);
    expect(results.every((result) => result.matchedBy === "full_text")).toBe(true);
  });

  test("orders exact score ties deterministically by chunk ID", () => {
    const semantic = [candidate("chunk-b", 1), candidate("chunk-a", 1)];

    const first = selectRetrievalCandidates(semantic, "semantic", defaultOptions);
    const second = selectRetrievalCandidates([...semantic].reverse(), "semantic", defaultOptions);

    expect(first.map((result) => result.chunkId)).toEqual(["chunk-a", "chunk-b"]);
    expect(second.map((result) => result.chunkId)).toEqual(["chunk-a", "chunk-b"]);
  });

  test("removes duplicate normalized content when hashes are unavailable", () => {
    const semantic = [
      candidate("preferred", 1, { content: "Shared   content", contentHash: null }),
      candidate("duplicate", 2, { content: " Shared content ", contentHash: null }),
      candidate("unique", 3, { content: "Unique content", contentHash: null }),
    ];

    const results = selectRetrievalCandidates(semantic, "semantic", defaultOptions);

    expect(results.map((result) => result.chunkId)).toEqual(["preferred", "unique"]);
  });

  test("caps chunks returned from each datasource", () => {
    const semantic = [
      candidate("source-a-1", 1, { datasourceId: "source-a" }),
      candidate("source-a-2", 2, { datasourceId: "source-a" }),
      candidate("source-b-1", 3, { datasourceId: "source-b" }),
    ];

    const results = selectRetrievalCandidates(semantic, "semantic", {
      ...defaultOptions,
      maxChunksPerDatasource: 1,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["source-a-1", "source-b-1"]);
  });

  test("limits the final result set", () => {
    const semantic = [candidate("one", 1), candidate("two", 2), candidate("three", 3)];

    const results = selectRetrievalCandidates(semantic, "semantic", {
      ...defaultOptions,
      limit: 2,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["one", "two"]);
  });
});
