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
    pgPool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pgPool;
}
