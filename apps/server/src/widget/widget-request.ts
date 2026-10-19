import { randomUUID } from "node:crypto";

export function parseOrigin(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeAllowedDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = parseOrigin(trimmed);
  if (direct) {
    return direct;
  }

  return parseOrigin(`https://${trimmed}`);
}

// The embedding page's origin. A browser request's Origin/Referer can't be forged by page
// script, so it wins. Only requests from our own widget iframe carry the `hostOrigin` hint,
// which the iframe derives from `location.ancestorOrigins` / `document.referrer` rather than
// from its URL, so an attacker framing /widget?hostOrigin=allowed.com can't spoof it.
export function resolveEmbedOrigin(input: {
  origin: string | undefined;
  referer: string | undefined;
  hostOriginHint: string | undefined;
  widgetAppOrigin: string | null;
}): string | null {
  const origin = parseOrigin(input.origin) ?? parseOrigin(input.referer);

  if (origin && origin === input.widgetAppOrigin) {
    return parseOrigin(input.hostOriginHint);
  }

  return origin;
}

export function isOriginAllowed(
  allowedDomains: string[] | null | undefined,
  requestOrigin: string | null,
): boolean {
  const allowed = (allowedDomains ?? [])
    .map(normalizeAllowedDomain)
    .filter((entry): entry is string => entry !== null);

  if (allowed.length === 0) {
    return true;
  }

  if (!requestOrigin) {
    return false;
  }

  return allowed.includes(requestOrigin);
}

// The widget sends only the visitor's newest message. Anything else in the request body is
// ignored, so a visitor can't inject assistant turns, tool results or edited history.
export function parseIncomingUserMessage(message: unknown) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const { id, parts } = message as { id?: unknown; parts?: unknown };
  if (!Array.isArray(parts)) {
    return null;
  }

  const textParts = parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part?.type === "text" && typeof part.text === "string" && part.text.trim().length > 0,
    )
    .map((part) => ({ type: "text" as const, text: part.text }));

  if (textParts.length === 0) {
    return null;
  }

  return {
    id: typeof id === "string" && id.length > 0 && id.length <= 128 ? id : randomUUID(),
    role: "user" as const,
    parts: textParts,
  };
}
