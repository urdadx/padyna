import type { TextChunk } from "./file/types";

const CHUNK_TOKEN_BUDGET = 300;
const OVERLAP_TOKEN_BUDGET = 50;

const sentenceSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "sentence" })
    : null;

const wordSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

const approximateTokenPattern = /[\p{L}\p{M}\p{N}]+|[^\s]/gu;
const wordLikePattern = /^[\p{L}\p{M}\p{N}]+$/u;
const textEncoder = new TextEncoder();

/**
 * A dependency-free token approximation. Word-like runs use roughly one token
 * per four UTF-8 bytes, while punctuation and symbols count as one token each.
 */
function approximateTokenCount(text: string) {
  let count = 0;

  for (const match of text.matchAll(approximateTokenPattern)) {
    const part = match[0];
    count += wordLikePattern.test(part)
      ? Math.max(1, Math.ceil(textEncoder.encode(part).length / 4))
      : 1;
  }

  return count;
}

function splitOversizedPart(part: string, maxTokens: number) {
  const pieces: string[] = [];
  let current = "";

  for (const character of part) {
    const candidate = `${current}${character}`;
    if (current && approximateTokenCount(candidate) > maxTokens) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

function splitTextToBudget(text: string, maxTokens: number) {
  if (approximateTokenCount(text) <= maxTokens) {
    return [text];
  }

  const parts = wordSegmenter
    ? Array.from(wordSegmenter.segment(text), ({ segment }) => segment)
    : (text.match(/\S+\s*|\s+/gu) ?? [text]);
  const pieces: string[] = [];
  let current = "";

  for (const part of parts) {
    if (approximateTokenCount(part) > maxTokens) {
      if (current.trim()) {
        pieces.push(current.trimEnd());
        current = "";
      }
      pieces.push(...splitOversizedPart(part, maxTokens));
      continue;
    }

    const candidate = `${current}${part}`;
    if (current.trim() && approximateTokenCount(candidate) > maxTokens) {
      pieces.push(current.trimEnd());
      current = part.trimStart();
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    pieces.push(current.trimEnd());
  }

  return pieces.filter((piece) => piece.trim());
}

function splitIntoSentenceUnits(text: string) {
  if (sentenceSegmenter) {
    const segments = Array.from(sentenceSegmenter.segment(text), ({ segment }) => segment).filter(
      (segment) => segment.trim(),
    );
    if (segments.length > 0) {
      return segments;
    }
  }

  const segments = text.match(/.*?(?:[.!?。！？]+(?:\s+|$)|$)/gu) ?? [];
  return segments.filter((segment) => segment.trim());
}

type BlockKind = "prose" | "heading" | "list" | "table" | "quote" | "code";

interface SemanticBlock {
  kind: BlockKind;
  text: string;
  fence?: string;
}

function classifyLine(line: string): BlockKind {
  if (/^\s{0,3}#{1,6}\s/.test(line) || /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
    return "heading";
  }
  if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
    return "list";
  }
  if (/^\s*>/.test(line)) {
    return "quote";
  }
  if (/^\s*\|.*\|\s*$/.test(line)) {
    return "table";
  }
  if (/^(?: {4}|\t)/.test(line)) {
    return "code";
  }
  return "prose";
}

function parseSemanticBlocks(text: string) {
  const blocks: SemanticBlock[] = [];
  const lines = text.split("\n");
  let currentKind: BlockKind | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentKind && currentLines.length > 0) {
      blocks.push({ kind: currentKind, text: currentLines.join("\n") });
    }
    currentKind = null;
    currentLines = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      flush();
      const fence = fenceMatch[1] ?? "```";
      const fenceLines = [line];

      for (index += 1; index < lines.length; index += 1) {
        const fenceLine = lines[index] ?? "";
        fenceLines.push(fenceLine);
        const trimmed = fenceLine.trim();
        if (
          trimmed.length >= fence.length &&
          Array.from(trimmed).every((character) => character === fence[0])
        ) {
          break;
        }
      }

      blocks.push({ kind: "code", text: fenceLines.join("\n"), fence });
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    let kind = classifyLine(line);
    if (currentKind === "list" && /^\s{2,}\S/.test(line)) {
      kind = "list";
    }

    if (currentKind && kind !== currentKind) {
      flush();
    }
    currentKind = kind;
    currentLines.push(line);
  }

  flush();
  return blocks;
}

function splitLinesToBudget(lines: string[], maxTokens: number) {
  const pieces: string[] = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (approximateTokenCount(candidate) <= maxTokens) {
      current = candidate;
      continue;
    }

    if (current) {
      pieces.push(current);
      current = "";
    }

    if (approximateTokenCount(line) <= maxTokens) {
      current = line;
    } else {
      pieces.push(...splitTextToBudget(line, maxTokens));
    }
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

function splitFencedBlock(block: SemanticBlock) {
  const lines = block.text.split("\n");
  const opening = lines[0] ?? block.fence ?? "```";
  const fence = block.fence ?? "```";
  const lastLine = lines.at(-1)?.trim() ?? "";
  const isClosed =
    lines.length > 1 &&
    lastLine.length >= fence.length &&
    Array.from(lastLine).every((character) => character === fence[0]);
  const closing = isClosed ? (lines.at(-1) ?? fence) : "";
  const body = lines.slice(1, isClosed ? -1 : undefined);
  const wrapperTokens = approximateTokenCount(`${opening}\n${closing}`);
  const bodyBudget = CHUNK_TOKEN_BUDGET - wrapperTokens;

  if (bodyBudget <= 0) {
    return splitTextToBudget(block.text, CHUNK_TOKEN_BUDGET);
  }

  const bodyPieces = splitLinesToBudget(body, bodyBudget);
  if (bodyPieces.length === 0) {
    return [block.text];
  }

  return bodyPieces.map((bodyPiece) => `${opening}\n${bodyPiece}${closing ? `\n${closing}` : ""}`);
}

interface ChunkUnit {
  fragment: string;
}

function createChunkUnits(blocks: SemanticBlock[]) {
  const units: ChunkUnit[] = [];

  for (const block of blocks) {
    let pieces: string[];

    if (block.fence && approximateTokenCount(block.text) > CHUNK_TOKEN_BUDGET) {
      pieces = splitFencedBlock(block);
    } else if (block.kind !== "prose") {
      pieces =
        approximateTokenCount(block.text) <= CHUNK_TOKEN_BUDGET
          ? [block.text]
          : splitLinesToBudget(block.text.split("\n"), CHUNK_TOKEN_BUDGET);
    } else {
      pieces = splitIntoSentenceUnits(block.text).flatMap((sentence) =>
        splitTextToBudget(sentence, CHUNK_TOKEN_BUDGET),
      );
    }

    for (let index = 0; index < pieces.length; index += 1) {
      const blockSeparator = units.length > 0 && index === 0 ? "\n\n" : "";
      units.push({ fragment: `${blockSeparator}${pieces[index] ?? ""}` });
    }
  }

  return units;
}

function renderUnits(units: ChunkUnit[]) {
  return units
    .map(({ fragment }) => fragment)
    .join("")
    .replace(/^\n+|\n+$/g, "");
}

export function splitIntoChunks(input: string) {
  const normalizedText = input.replace(/\r\n?/g, "\n");
  if (!normalizedText.trim()) {
    return [];
  }

  const units = createChunkUnits(parseSemanticBlocks(normalizedText));
  const chunks: string[] = [];
  let currentUnits: ChunkUnit[] = [];

  for (const unit of units) {
    const candidateUnits = [...currentUnits, unit];
    if (approximateTokenCount(renderUnits(candidateUnits)) <= CHUNK_TOKEN_BUDGET) {
      currentUnits = candidateUnits;
      continue;
    }

    if (currentUnits.length > 0) {
      chunks.push(renderUnits(currentUnits));
    }

    let overlapUnits: ChunkUnit[] = [];
    for (let index = currentUnits.length - 1; index >= 0; index -= 1) {
      const overlapCandidate = [currentUnits[index] as ChunkUnit, ...overlapUnits];
      if (
        approximateTokenCount(renderUnits(overlapCandidate)) > OVERLAP_TOKEN_BUDGET ||
        approximateTokenCount(renderUnits([...overlapCandidate, unit])) > CHUNK_TOKEN_BUDGET
      ) {
        break;
      }
      overlapUnits = overlapCandidate;
    }

    currentUnits = [...overlapUnits, unit];
  }

  if (currentUnits.length > 0) {
    chunks.push(renderUnits(currentUnits));
  }

  return chunks.filter((chunk) => chunk.trim());
}

export function chunkText(contentText: string): TextChunk[] {
  return splitIntoChunks(contentText).map((content, chunkIndex) => ({
    chunkIndex,
    content,
    tokenCount: approximateTokenCount(content),
    charCount: content.length,
  }));
}

export function estimateContentTokens(contentText: string) {
  return approximateTokenCount(contentText);
}
