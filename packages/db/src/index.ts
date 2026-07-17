import { env } from "@padyna/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PoolClient } from "pg";

import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, { schema });

export { Pool };
export type { PoolClient };

let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      query_timeout: 5_000,
      statement_timeout: 5_000,
    });
  }
  return pgPool;
}
