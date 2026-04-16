import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database setup.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  // Fresh deployments need extensions available before drizzle-kit push creates
  // tables that depend on them.
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  // Older databases may predate this column even though current auth code
  // expects it on every user lookup.
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'admin' NOT NULL`);

  console.log(`Database extensions setup completed`);
} finally {
  await pool.end();
}
