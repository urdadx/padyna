import { access } from "node:fs/promises";
import path from "node:path";
import { getPgPool } from "@padyna/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function resolveMigrationsFolder() {
  const candidates = [
    path.resolve(process.cwd(), "node_modules/@padyna/db/src/migrations"),
    path.resolve(process.cwd(), "packages/db/src/migrations"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known runtime layout.
    }
  }

  throw new Error("Could not find the database migrations folder.");
}

const pool = getPgPool();

try {
  const migrationsFolder = await resolveMigrationsFolder();
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder });
  console.log(`Database migrations completed from ${migrationsFolder}`);
} finally {
  await pool.end();
}
