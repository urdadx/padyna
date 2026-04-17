import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to verify chat conversation schema.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(`
    ALTER TABLE "chat_conversation"
    ADD COLUMN IF NOT EXISTS "is_high_priority" boolean DEFAULT false NOT NULL
  `);

  console.log(`Chat conversation schema verified`);
} finally {
  await pool.end();
}
