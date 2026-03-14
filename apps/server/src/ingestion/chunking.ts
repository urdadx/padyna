import type { TextChunk } from "./file/types";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const IDEAL_PARAGRAPH_SIZE = 900;

const sentenceSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("en", { granularity: "sentence" })
    : null;

function estimateTokenCount(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(/\s+/).length;
}

function splitLongSegment(text: string, maxLength: number) {
  const pieces: string[] = [];
  let remainder = text.trim();

  while (remainder.length > maxLength) {
    let cutPoint = remainder.lastIndexOf(" ", maxLength);
    if (cutPoint < Math.floor(maxLength * 0.5)) {
      cutPoint = maxLength;
    }

    pieces.push(remainder.slice(0, cutPoint).trim());
    remainder = remainder.slice(cutPoint).trim();
  }

  if (remainder) {
    pieces.push(remainder);
  }

  return pieces;
}

function splitIntoSentenceUnits(paragraph: string) {
  if (sentenceSegmenter) {
    const segments = Array.from(sentenceSegmenter.segment(paragraph), (segment) =>
      segment.segment.trim(),
    ).filter(Boolean);
    if (segments.length > 0) {
      return segments;
    }
  }

  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractOverlap(text: string, maxLength: number) {
  if (maxLength <= 0) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  let startIndex = text.length - maxLength;
  while (startIndex > 0 && !/\s/.test(text[startIndex] ?? "")) {
    startIndex -= 1;
  }

  return text.slice(startIndex).trim();
}

export function splitIntoChunks(input: string) {
  const normalizedText = input.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    return [];
  }

  const semanticSegments = normalizedText
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .flatMap((paragraph) => {
      if (paragraph.length <= IDEAL_PARAGRAPH_SIZE) {
        return [paragraph];
      }

      return splitIntoSentenceUnits(paragraph).flatMap((sentence) =>
        splitLongSegment(sentence, Math.max(CHUNK_SIZE - CHUNK_OVERLAP, 300)),
      );
    });

  const chunks: string[] = [];
  let currentChunk = "";

  for (const segment of semanticSegments) {
    if (!currentChunk) {
      currentChunk = segment;
      continue;
    }

    const candidateChunk = `${currentChunk}\n\n${segment}`;
    if (candidateChunk.length <= CHUNK_SIZE) {
      currentChunk = candidateChunk;
      continue;
    }

    chunks.push(currentChunk);

    const overlap = extractOverlap(currentChunk, CHUNK_OVERLAP);
    const allowedOverlapLength = Math.max(CHUNK_SIZE - segment.length - 2, 0);
    const adjustedOverlap = overlap
      ? extractOverlap(overlap, Math.min(CHUNK_OVERLAP, allowedOverlapLength))
      : "";

    currentChunk = adjustedOverlap ? `${adjustedOverlap}\n\n${segment}` : segment;

    if (currentChunk.length > CHUNK_SIZE) {
      const [firstPart, ...remainingParts] = splitLongSegment(currentChunk, CHUNK_SIZE);
      if (firstPart) {
        chunks.push(firstPart);
      }
      currentChunk = remainingParts.join("\n\n").trim();
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(Boolean);
}

export function chunkText(contentText: string): TextChunk[] {
  return splitIntoChunks(contentText).map((content, chunkIndex) => ({
    chunkIndex,
    content,
    tokenCount: estimateTokenCount(content),
    charCount: content.length,
  }));
}

export function estimateContentTokens(contentText: string) {
  return estimateTokenCount(contentText);
}
