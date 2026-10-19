import { RedisClient } from "bun";
import { env } from "@padyna/env/server";

/** Shared Redis connection for rate limiting and caches. */
export const redis = new RedisClient(env.REDIS_URL);
