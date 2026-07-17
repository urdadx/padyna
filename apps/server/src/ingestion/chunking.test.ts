import { describe, expect, test } from "bun:test";

import { chunkText, estimateContentTokens, splitIntoChunks } from "./chunking";

describe("splitIntoChunks", () => {
  test("keeps every chunk within the approximate token budget", () => {
    const input = Array.from(
      { length: 180 },
      (_, index) => `Sentence ${index} carries enough searchable information for this document.`,
    ).join(" ");

    const chunks = chunkText(input);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.tokenCount <= 300)).toBe(true);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_, index) => index));
  });

  test("repeats complete semantic context across adjacent chunks", () => {
    const input = Array.from(
      { length: 120 },
      (_, index) => `Retrieval marker ${index} supplies durable context.`,
    ).join(" ");
    const chunks = splitIntoChunks(input);
    const markers = (chunk: string) =>
      new Set(chunk.match(/Retrieval marker \d+ supplies durable context\./g) ?? []);

    expect(chunks.length).toBeGreaterThan(1);
    for (let index = 1; index < chunks.length; index += 1) {
      const previousMarkers = markers(chunks[index - 1] ?? "");
      const currentMarkers = markers(chunks[index] ?? "");
      expect([...currentMarkers].some((marker) => previousMarkers.has(marker))).toBe(true);
    }
  });

  test("preserves Markdown list lines and fenced code", () => {
    const list = "- first item\n- second item\n  - nested item";
    const code = "```ts\nconst value = 42;\nconsole.log(value);\n```";
    const input = `# Notes\n\n${list}\n\n${code}`;
    const output = splitIntoChunks(input).join("\n\n");

    expect(output).toContain(list);
    expect(output).toContain(code);
    expect(output).not.toContain("- first item - second item");
  });

  test("returns no chunks for empty input", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("  \n\t\n  ")).toEqual([]);
    expect(chunkText("  ")).toEqual([]);
  });

  test("segments and budgets multilingual text", () => {
    const passage =
      "これは検索に役立つ日本語の文です。هذه جملة عربية مفيدة للاسترجاع. " +
      "Esta oración conserva el contexto multilingüe. ";
    const chunks = splitIntoChunks(passage.repeat(80));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => estimateContentTokens(chunk) <= 300)).toBe(true);
    expect(chunks.some((chunk) => chunk.includes("これは検索に役立つ日本語の文です。"))).toBe(true);
    expect(chunks.some((chunk) => chunk.includes("هذه جملة عربية مفيدة للاسترجاع."))).toBe(true);
    expect(estimateContentTokens("日本語の文章です")).toBeGreaterThan(1);
  });
});
