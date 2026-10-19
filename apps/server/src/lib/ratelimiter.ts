import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { redis } from "./redis";

type RateLimitInput = {
  namespace: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
  now?: Date;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
  count: number;
  key: string;
};

type RateLimitMiddlewareOptions = {
  namespace: string;
  maxRequests: number;
  windowSeconds: number;
  resolveIdentifier: (c: Context) => string | null | undefined | Promise<string | null | undefined>;
};

function toBucket(now: Date, windowSeconds: number): number {
  const epochSeconds = Math.floor(now.getTime() / 1000);
  return Math.floor(epochSeconds / windowSeconds);
}

function toKey(input: RateLimitInput, bucket: number): string {
  return `ratelimit:${input.namespace}:${input.identifier}:${bucket}`;
}

function toResetAt(now: Date, windowSeconds: number): Date {
  const epochSeconds = Math.floor(now.getTime() / 1000);
  const nextWindowEpoch = Math.floor(epochSeconds / windowSeconds) * windowSeconds + windowSeconds;
  return new Date(nextWindowEpoch * 1000);
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const bucket = toBucket(now, input.windowSeconds);
  const key = toKey(input, bucket);

  const incremented = await redis.incr(key);
  const count = Number(incremented ?? 0);

  if (count === 1) {
    await redis.expire(key, input.windowSeconds);
  }

  const ttlValue = await redis.ttl(key);
  const ttl = Number(ttlValue ?? input.windowSeconds);
  const retryAfterSeconds = ttl > 0 ? ttl : input.windowSeconds;

  const allowed = count <= input.maxRequests;
  const remaining = Math.max(0, input.maxRequests - count);

  return {
    allowed,
    limit: input.maxRequests,
    remaining,
    retryAfterSeconds,
    resetAt: toResetAt(now, input.windowSeconds).toISOString(),
    count,
    key,
  };
}

export function applyRateLimitHeaders(headers: Headers, result: RateLimitResult) {
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", result.resetAt);
  headers.set("Retry-After", String(result.retryAfterSeconds));
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  return createMiddleware(async (c, next) => {
    const resolvedIdentifier = await options.resolveIdentifier(c);
    const identifier = resolvedIdentifier?.trim() || "unknown";

    const result = await checkRateLimit({
      namespace: options.namespace,
      identifier,
      maxRequests: options.maxRequests,
      windowSeconds: options.windowSeconds,
    });

    if (!result.allowed) {
      const headers = new Headers();
      applyRateLimitHeaders(headers, result);
      return c.json(
        {
          message: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429, headers },
      );
    }

    await next();
    applyRateLimitHeaders(c.res.headers, result);
  });
}

export function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = c.req.header("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
