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
import { one, pool, query, scalar } from "./client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { runMigrations } from "./migrate";

/** Columns the products table holds properly; everything else is a spec. */
const REAL_COLUMNS = new Set([
  "id", "slug", "kind", "brand", "model", "mpn", "family", "condition",
  "segment", "price", "avail", "warrantyMonths", "releaseYear",
  "searchKey", "highlights", "tags", "productMedia",
]);

let ready: Promise<void> | null = null;

/** Runs the setup once, and returns the same promise to everyone after that. */
export function ensureReady(): Promise<void> {
  ready ??= setup();
  return ready;
}

async function setup(): Promise<void> {
  validateProductionConfiguration();
  await runMigrations();

  await ensureAdmin();
  await seedCatalog();
}

function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  const password = process.env.ADMIN_PASSWORD ?? "";
  const dbPassword = process.env.POSTGRES_PASSWORD ?? "";
  const encryptionKey = process.env.AUTH_ENCRYPTION_KEY ?? "";
  if (!process.env.ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is required in production.");
  if (password.length < 14 || password.toLowerCase() === "changeme") {
    throw new Error("ADMIN_PASSWORD must be at least 14 characters and cannot use the default.");
  }
  if (!process.env.DATABASE_URL && (!dbPassword || dbPassword === "supercomputers")) {
    throw new Error("Set DATABASE_URL or a non-default POSTGRES_PASSWORD in production.");
  }
  if (encryptionKey.length < 32 || encryptionKey === "development-only-change-this-key") {
    throw new Error("AUTH_ENCRYPTION_KEY must be a unique value of at least 32 characters in production.");
  }
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 24 || process.env.CRON_SECRET === "development-maintenance-secret") {
    throw new Error("CRON_SECRET must be a unique value of at least 24 characters in production.");
  }
  if (!process.env.APP_URL?.startsWith("https://")) throw new Error("APP_URL must be an HTTPS URL in production.");
  if (!process.env.EMAIL_WEBHOOK_URL) throw new Error("EMAIL_WEBHOOK_URL is required for production password resets.");
}

async function ensureAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@supercomputers.pk").toLowerCase();
  const existing = await one<{ id: number; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = $1", [email]);
  if (existing) {
    if (process.env.NODE_ENV === "production" && await verifyPassword("changeme", existing.password_hash)) {
      throw new Error("The existing administrator still uses the default password. Reset it before production startup.");
    }
    return;
  }

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
