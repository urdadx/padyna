import { describe, expect, test } from "bun:test";
import { convertFileToMarkdown } from "./anydoc";

describe("convertFileToMarkdown", () => {
  test("preserves Markdown files as text", async () => {
    const file = new File(["# Heading\n\nParagraph"], "notes.md", {
      type: "text/markdown",
    });

    expect(await convertFileToMarkdown(file, "md")).toBe("# Heading\n\nParagraph");
  });

  test("converts CSV bytes through Anydoc", async () => {
    const file = new File(["name,score\nAda,10"], "scores.csv", {
      type: "text/csv",
    });

    const markdown = await convertFileToMarkdown(file, "csv");

    expect(markdown).toContain("| name | score |");
    expect(markdown).toContain("| Ada | 10 |");
  });
});
