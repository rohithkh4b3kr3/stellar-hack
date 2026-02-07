/**
 * PostgreSQL connection and schema.
 * Set DATABASE_URL or leave unset to skip DB (in-memory fallback in store).
 */
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  return pool;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  contract_id TEXT,
  job_id BIGINT,
  business_address TEXT NOT NULL,
  freelancer_address TEXT,
  token_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_amount TEXT NOT NULL,
  advance_amount TEXT NOT NULL,
  delivery_deadline_ts BIGINT NOT NULL,
  verification_window_secs INT NOT NULL DEFAULT 259200,
  applicants JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON projects(contract_id);
`;

export async function initDb(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL not set; using in-memory store.");
    return;
  }
  pool = new Pool({ connectionString: url });
  try {
    await pool.query(CREATE_TABLE);
    await pool.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS job_id BIGINT;");
    console.log("PostgreSQL connected and schema ready.");
  } catch (e) {
    console.error("PostgreSQL init failed:", e);
    throw e;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
