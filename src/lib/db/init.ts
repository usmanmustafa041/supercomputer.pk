/**
 * Getting the database ready, once per boot.
 *
 * Creates the tables, makes sure an administrator exists, and fills the catalog
 * the first time. All three are safe to run repeatedly.
 *
 * The catalog seed is the part that got simpler when the Python service went
 * away. The generator that produces the 2,781 products is TypeScript and now
 * runs in this same process, so there is no export file to keep current and no
 * 2.6MB of JSON in the repository. After the first boot the database is the
 * source of truth and the admin edits rows.
 */

import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool, query, scalar } from "./client";
import { hashPassword } from "@/lib/auth/password";

/** Columns the products table holds properly; everything else is a spec. */
const REAL_COLUMNS = new Set([
  "id", "slug", "kind", "brand", "model", "mpn", "family", "condition",
  "segment", "price", "avail", "warrantyMonths", "releaseYear",
  "searchKey", "highlights", "tags",
]);

let ready: Promise<void> | null = null;

/** Runs the setup once, and returns the same promise to everyone after that. */
export function ensureReady(): Promise<void> {
  ready ??= setup();
  return ready;
}

async function setup(): Promise<void> {
  const schema = await readFile(join(process.cwd(), "src/lib/db/schema.sql"), "utf-8");
  await pool.query(schema);

  await ensureAdmin();
  await seedCatalog();
}

async function ensureAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@supercomputers.pk").toLowerCase();
  const existing = await scalar<number>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'admin')`,
    [email, await hashPassword(password), "Administrator"],
  );
  console.log(`[db] created the administrator account ${email}`);
}

async function seedCatalog(): Promise<void> {
  const count = await scalar<string>("SELECT count(*) FROM products");
  if (Number(count) > 0) return;

  // Imported here rather than at the top of the file: it pulls in the whole
  // catalog generator, which is only needed on a first boot.
  const { allProducts } = await import("@/lib/catalog");
  const products = allProducts();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
    await client.query("COMMIT");
    console.log(`[db] seeded ${products.length.toLocaleString()} products`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
