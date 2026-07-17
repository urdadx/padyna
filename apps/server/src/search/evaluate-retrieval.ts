import type { HybridRetrievalMetrics, SemanticSearchMode } from "./hybrid-retrieval";

interface EvaluationItem {
  query: string;
  chatbotId: string;
  organizationId: string;
  expectedDatasourceIds: string[];
}

interface Latencies {
  total: number[];
  embedding: number[];
  semantic: number[];
  fullText: number[];
}

interface MissedQuery {
  index: number;
  query: string;
  expectedDatasourceIds: string[];
  retrievedDatasourceIds: string[];
}

function parseDataset(value: unknown): EvaluationItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Evaluation dataset must be a non-empty JSON array.");
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Dataset item ${index + 1} must be an object.`);
    }

    const record = item as Record<string, unknown>;
    const fields = ["query", "chatbotId", "organizationId"] as const;
    for (const field of fields) {
      if (typeof record[field] !== "string" || record[field].trim() === "") {
        throw new Error(`Dataset item ${index + 1} has an invalid ${field}.`);
      }
    }

    if (
      !Array.isArray(record.expectedDatasourceIds) ||
      record.expectedDatasourceIds.length === 0 ||
      !record.expectedDatasourceIds.every(
        (datasourceId) => typeof datasourceId === "string" && datasourceId.trim() !== "",
      )
    ) {
      throw new Error(`Dataset item ${index + 1} must have at least one expectedDatasourceId.`);
    }

    return {
      query: record.query as string,
      chatbotId: record.chatbotId as string,
      organizationId: record.organizationId as string,
      expectedDatasourceIds: [...new Set(record.expectedDatasourceIds as string[])],
    };
  });
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(quantile * sorted.length) - 1);
  return sorted[index] ?? null;
}

function formatLatency(values: number[]): string {
  const p50 = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  if (p50 === null || p95 === null) {
    return "p50 n/a, p95 n/a (0 samples)";
  }

  return `p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms (${values.length} samples)`;
}

function collectLatencies(latencies: Latencies, metrics: HybridRetrievalMetrics) {
  latencies.total.push(metrics.totalMs);
  if (metrics.embeddingMs !== null) latencies.embedding.push(metrics.embeddingMs);
  if (metrics.semanticMs !== null) latencies.semantic.push(metrics.semanticMs);
  if (metrics.fullTextMs !== null) latencies.fullText.push(metrics.fullTextMs);
}

async function main() {
  const datasetPath = Bun.argv[2];
  if (!datasetPath) {
    throw new Error(
      "Usage: bun run evaluate-search -- <dataset.json> [k] [approximate|exact] [show-misses]",
    );
  }

  const requestedK = Bun.argv[3] === undefined ? 8 : Number(Bun.argv[3]);
  if (!Number.isInteger(requestedK) || requestedK < 1 || requestedK > 50) {
    throw new Error("k must be an integer between 1 and 50.");
  }
  const k = requestedK;
  const searchMode = Bun.argv[4] ?? "approximate";
  if (searchMode !== "approximate" && searchMode !== "exact") {
    throw new Error("search mode must be approximate or exact.");
  }
  const showMisses = Bun.argv[5] === "show-misses";
  if (Bun.argv[5] !== undefined && !showMisses) {
    throw new Error("The optional fourth argument must be show-misses.");
  }

  const dataset = parseDataset(await Bun.file(datasetPath).json());
  const { retrieveHybridChunks } = await import("./hybrid-retrieval");
  const latencies: Latencies = { total: [], embedding: [], semantic: [], fullText: [] };
  let recallTotal = 0;
  let reciprocalRankTotal = 0;
  let zeroResults = 0;
  let fallbackCount = 0;
  let failedQueries = 0;
  const missedQueries: MissedQuery[] = [];

  for (const [index, item] of dataset.entries()) {
    let metrics: HybridRetrievalMetrics | undefined;

    try {
      const results = await retrieveHybridChunks({
        query: item.query,
        chatbotId: item.chatbotId,
        organizationId: item.organizationId,
        limit: k,
        semanticSearchMode: searchMode as SemanticSearchMode,
        onMetrics: (value) => {
          metrics = value;
        },
      });
      const expected = new Set(item.expectedDatasourceIds);
      const rankedDatasourceIds = results.slice(0, k).map((result) => result.datasourceId);
      const retrievedExpected = new Set(
        rankedDatasourceIds.filter((datasourceId) => expected.has(datasourceId)),
      );
      const firstRelevantRank = rankedDatasourceIds.findIndex((datasourceId) =>
        expected.has(datasourceId),
      );

      recallTotal += retrievedExpected.size / expected.size;
      reciprocalRankTotal += firstRelevantRank === -1 ? 0 : 1 / (firstRelevantRank + 1);
      if (firstRelevantRank === -1) {
        missedQueries.push({
          index: index + 1,
          query: item.query,
          expectedDatasourceIds: item.expectedDatasourceIds,
          retrievedDatasourceIds: [...new Set(rankedDatasourceIds)],
        });
      }
      if (results.length === 0) zeroResults += 1;
      if (metrics?.degradedToFullText) fallbackCount += 1;
      if (metrics) collectLatencies(latencies, metrics);
    } catch (error) {
      failedQueries += 1;
      zeroResults += 1;
      console.error(`Query ${index + 1} failed:`, error);
    }
  }

  const count = dataset.length;
  console.log(`Queries: ${count}`);
  console.log(`Semantic search mode: ${searchMode}`);
  console.log(`Source Recall@${k}: ${((recallTotal / count) * 100).toFixed(2)}%`);
  console.log(`MRR@${k}: ${(reciprocalRankTotal / count).toFixed(4)}`);
  console.log(
    `Zero-result rate: ${((zeroResults / count) * 100).toFixed(2)}% (${zeroResults}/${count})`,
  );
  console.log(`Degraded/full-text fallback count: ${fallbackCount}`);
  console.log(`Failed queries: ${failedQueries}`);
  console.log(`Missed queries: ${missedQueries.length}`);
  console.log(`Total latency: ${formatLatency(latencies.total)}`);
  console.log(`Embedding latency: ${formatLatency(latencies.embedding)}`);
  console.log(`Semantic latency: ${formatLatency(latencies.semantic)}`);
  console.log(`FTS latency: ${formatLatency(latencies.fullText)}`);

  if (showMisses && missedQueries.length > 0) {
    console.log(JSON.stringify({ missedQueries }, null, 2));
  }

  if (failedQueries > 0) {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
