import { access } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  const migrationsFolder = await resolveMigrationsFolder();
  const db = drizzle(pool);

  // Fresh deployments need extensions available before migrations create
  // tables that depend on them.
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await migrate(db, { migrationsFolder });
  console.log(`Database migrations completed from ${migrationsFolder}`);
} finally {
  await pool.end();
}
