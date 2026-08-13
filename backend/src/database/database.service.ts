/**
 * The one connection to Postgres, and the only place in the system that has it.
 *
 * A pool, not a connection: opening a fresh one per request would spend more
 * time on the handshake than on the query. `pg` hands out an idle connection
 * and takes it back when the query finishes.
 *
 * Queries use $1, $2 placeholders rather than pasting values into the SQL
 * string. That is what stops a product name containing a quote mark from being
 * read as SQL, and it is not optional.
 *
 * No ORM. The schema is four tables and the queries are the interesting part of
 * this application; an ORM would hide the joins behind an abstraction the team
 * would then have to learn twice, once to write it and once to work out what it
 * emitted. Repositories give the same seam without the indirection.
 */

import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { AppConfig } from "../config/configuration";
import { APP_CONFIG } from "../config/config.token";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  onModuleInit(): void {
    this.pool = new Pool({
      connectionString: this.config.database.url,
      max: this.config.database.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // A pool error is emitted on an idle client, outside any request, and an
    // unhandled one takes the process down.
    this.pool.on("error", (err) => this.logger.error(`idle client error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  /** Every row the query returned. */
  async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query<T>(text, params);
    return res.rows;
  }

  /** The first row, or null. For lookups that expect at most one. */
  async one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  /** A single value, for counts and existence checks. */
  async scalar<T>(text: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<Record<string, unknown>>(text, params);
    if (!rows.length) return null;
    return Object.values(rows[0])[0] as T;
  }

  /**
   * Runs the callback inside a transaction, on one connection.
   *
   * Taking a client out of the pool matters: without it each statement could
   * land on a different connection and BEGIN would apply to one of them while
   * the writes went to another.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /** Used by the health check, so "up" means "can actually serve a request". */
  async ping(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
