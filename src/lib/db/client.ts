/**
 * The one connection to Postgres.
 *
 * A pool, not a connection: opening a fresh one per request would spend more
 * time on the handshake than the query. `pg` hands out an idle connection and
 * takes it back when the query finishes.
 *
 * Queries here use $1, $2 placeholders rather than pasting values into the SQL
 * string. That is what stops a product name containing a quote mark from being
 * read as SQL, and it is not optional.
 */

import "server-only";
import { Pool, type QueryResultRow } from "pg";

const url =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.POSTGRES_USER ?? "supercomputers"}:${
    process.env.POSTGRES_PASSWORD ?? "supercomputers"
  }@${process.env.POSTGRES_HOST ?? "localhost"}:5432/${process.env.POSTGRES_DB ?? "supercomputers"}`;

/**
 * Next.js reloads modules in development, which would otherwise leave a pool
 * behind on every save until Postgres runs out of connections. Stashing it on
 * globalThis means the reload finds the existing one.
 */
const g = globalThis as typeof globalThis & { __scPool?: Pool };

export const pool =
  g.__scPool ??
  new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") g.__scPool = pool;

/** Every row the query returned. */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

/** The first row, or null. For lookups that expect at most one. */
export async function one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** A single value, for counts and existence checks. */
export async function scalar<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<Record<string, unknown>>(text, params);
  if (!rows.length) return null;
  return Object.values(rows[0])[0] as T;
}
