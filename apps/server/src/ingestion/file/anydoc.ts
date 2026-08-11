import { toMarkdownBytes, type Format } from "@firecrawl/anydoc";
import type { SupportedFileExtension } from "./types";

const PLAIN_TEXT_EXTENSIONS = new Set<SupportedFileExtension>(["txt", "md", "mdx"]);

export async function convertFileToMarkdown(
  file: File,
  extension?: SupportedFileExtension,
): Promise<string> {
  if (extension && PLAIN_TEXT_EXTENSIONS.has(extension)) {
    return file.text();
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return toMarkdownBytes(bytes, extension === "csv" ? ("csv" as Format) : undefined);
}
