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

  const { rows: uuidFunctionRows } = await pool.query<{ function_name: string | null }>(
    `select to_regprocedure('gen_random_uuid()')::text as function_name`,
  );
  if (!uuidFunctionRows[0]?.function_name) {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  }

  const { rows } = await pool.query<{ datasource_chunks: string | null }>(
    `select to_regclass('public.datasource_chunks')::text as datasource_chunks`,
  );

  if (rows[0]?.datasource_chunks) {
    await pool.query(`
      update datasource_chunks
      set embedding_model = 'text-embedding-3-small'
      where embedding_model = 'deterministic-hash-v1'
        and embedding_dimensions = 1536
    `);
    await pool.query(`
      update datasource_chunks as chunks
      set title = sources.source_name
      from datasources as sources
      where sources.id = chunks.datasource_id
        and chunks.title is null
    `);
  }

  console.log(`Database extensions setup completed`);
} finally {
  await pool.end();
}
