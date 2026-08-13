/**
 * Getting the database ready, once, at boot.
 *
 * This used to run lazily on the first request that needed it, which meant
 * every repository had to remember to await it first and the first visitor
 * after a deploy paid for the whole seed. It belongs in the API's startup: the
 * process is not ready to serve until the schema is there, so Nest waits for
 * it and the container's healthcheck does the rest.
 *
 * Everything here is safe to run repeatedly.
 */

import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { allProducts } from "@supercomputers/shared";
import { APP_CONFIG } from "../config/config.token";
import type { AppConfig } from "../config/configuration";
import { DatabaseService } from "./database.service";
import { hashPassword } from "../auth/password";
import { HOUSE_PRESETS } from "./house-presets";

/** Columns the products table holds properly; everything else is a spec. */
const REAL_COLUMNS = new Set([
  "id", "slug", "kind", "brand", "model", "mpn", "family", "condition",
  "segment", "price", "avail", "warrantyMonths", "releaseYear",
  "searchKey", "highlights", "tags",
]);

@Injectable()
export class SchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchemaService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.applySchema();
    await this.ensureAdmin();
    await this.seedCatalog();
    await this.seedPresets();
  }

  private async applySchema(): Promise<void> {
    // Beside the compiled file in dist, copied there by the Nest build's asset
    // rule, because the compiler only follows imports and would not have
    // noticed a .sql file.
    await this.db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    if (!(await this.db.scalar<string>("SELECT version FROM schema_migrations WHERE version = $1", ["001_base"]))) {
      await this.db.query(await readFile(join(__dirname, "schema.sql"), "utf-8"));
      await this.db.query("INSERT INTO schema_migrations(version) VALUES ($1)", ["001_base"]);
    }
    const dir = join(__dirname, "migrations");
    for (const file of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()) {
      const version = file.replace(/\.sql$/, "");
      if (await this.db.scalar<string>("SELECT version FROM schema_migrations WHERE version = $1", [version])) continue;
      await this.db.transaction(async (client) => {
        await client.query(await readFile(join(dir, file), "utf-8"));
        await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
      });
    }
    this.logger.log("database migrations applied");
  }

  private async ensureAdmin(): Promise<void> {
    const { email, password } = this.config.admin;
    const existing = await this.db.scalar<number>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) return;

    await this.db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [email, await hashPassword(password), "Administrator"],
    );
    this.logger.warn(`created the administrator account ${email}, change its password`);
  }

  /**
   * The catalogue is generated, so the seed runs the generator rather than
   * reading a fixture. After the first boot the database is the source of truth
   * and the admin panel edits rows.
   */
  private async seedCatalog(): Promise<void> {
    const count = Number(await this.db.scalar<string>("SELECT count(*) FROM products"));
    if (count > 0) return;

    const products = allProducts();
    await this.db.transaction(async (client) => {
      // One statement per product would be 2,781 round trips. Batched, it is
      // about thirty, and the whole thing runs in a couple of seconds.
      const BATCH = 100;
      for (let i = 0; i < products.length; i += BATCH) {
        const slice = products.slice(i, i + BATCH);
        const values: unknown[] = [];
        const rows: string[] = [];

        slice.forEach((p, n) => {
          const specs: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(p)) if (!REAL_COLUMNS.has(k)) specs[k] = v;

          const b = n * 21;
          rows.push(`(${Array.from({ length: 21 }, (_, j) => `$${b + j + 1}`).join(",")})`);
          values.push(
            p.id, p.slug, p.kind, p.brand, p.model, p.mpn, p.family, p.condition,
            p.segment, p.price.pkr, Boolean(p.price.onRequest), p.avail.inHouse,
            p.avail.leadDays, p.avail.indentOnly, p.warrantyMonths, p.releaseYear,
            p.searchKey, JSON.stringify(p.highlights), JSON.stringify(p.tags),
            JSON.stringify(specs), true,
          );
        });

        await client.query(
          `INSERT INTO products
             (sku, slug, kind, brand, model, mpn, family, condition, segment,
              price_pkr, price_on_request, stock_qty, lead_days, indent_only,
              warranty_months, release_year, search_key, highlights, tags, specs, is_active)
           VALUES ${rows.join(",")}
           ON CONFLICT (sku) DO NOTHING`,
          values,
        );
      }
    });
    this.logger.log(`seeded ${products.length.toLocaleString()} products`);
  }

  /**
   * Guarded on the table being empty rather than on each slug, so a preset an
   * administrator deliberately deleted does not reappear on the next restart.
   */
  private async seedPresets(): Promise<void> {
    const count = Number(await this.db.scalar<string>("SELECT count(*) FROM presets"));
    if (count > 0) return;

    for (const [i, p] of HOUSE_PRESETS.entries()) {
      await this.db.query(
        `INSERT INTO presets (slug, name, role, target, blurb, picks, position, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (slug) DO NOTHING`,
        [p.slug, p.name, p.role, p.target, p.blurb, JSON.stringify(p.picks), i],
      );
    }
    this.logger.log(`seeded ${HOUSE_PRESETS.length} pre-built configurations`);
  }
}
