import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./client";

const LEGACY_BASELINE = "202608120000_legacy_baseline";

/** Applies each SQL file once, under a Postgres advisory lock. */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(8392012601)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const appliedRows = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.rows.map((row) => row.version));

    // Existing installations are upgraded safely because the old schema is
    // idempotent. Once recorded, it is never run on boot again.
    if (!applied.has(LEGACY_BASELINE)) {
      const baseline = await readFile(join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(baseline);
        await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [LEGACY_BASELINE]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    const directory = join(process.cwd(), "src/lib/db/migrations");
    const files = (await readdir(directory)).filter((file) => /^\d{12,}_[a-z0-9_-]+\.sql$/i.test(file)).sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (applied.has(version)) continue;
      const sql = await readFile(join(directory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${version} failed`, { cause: error });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(8392012601)").catch(() => undefined);
    client.release();
  }
}
