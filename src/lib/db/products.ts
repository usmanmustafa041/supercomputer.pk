/**
 * Everything the app asks of the products table.
 *
 * All SQL lives in files like this one rather than being scattered through the
 * pages, so there is one place to look when a query is slow or wrong.
 */

import "server-only";
import { one, query, scalar } from "./client";
import { ensureReady } from "./init";
import type { Page, ProductRow } from "./types";

const COLUMNS = `id, sku, slug, kind, brand, model, mpn, family, condition, segment,
  price_pkr::float8 AS price_pkr, price_on_request, stock_qty, lead_days, indent_only,
  warranty_months, release_year, search_key, highlights, tags, specs, is_active,
  created_at, updated_at`;

export interface ProductFilter {
  q?: string;
  kind?: string;
  condition?: string;
  inStockOnly?: boolean;
  includeRetired?: boolean;
  page?: number;
  perPage?: number;
}

export async function listProducts(f: ProductFilter = {}): Promise<Page<ProductRow>> {
  await ensureReady();

  const where: string[] = [];
  const params: unknown[] = [];

  if (!f.includeRetired) where.push("is_active");
  if (f.kind) {
    params.push(f.kind);
    where.push(`kind = $${params.length}`);
  }
  if (f.condition) {
    params.push(f.condition);
    where.push(`condition = $${params.length}`);
  }
  if (f.inStockOnly) where.push("stock_qty > 0");
  if (f.q) {
    // One parameter used three times, so the search string is only sent once.
    params.push(`%${f.q.toLowerCase()}%`);
    const n = params.length;
    where.push(`(lower(model) LIKE $${n} OR lower(brand) LIKE $${n} OR lower(sku) LIKE $${n})`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number(await scalar<string>(`SELECT count(*) FROM products ${clause}`, params));

  const perPage = Math.min(Math.max(f.perPage ?? 25, 1), 100);
  const page = Math.max(f.page ?? 1, 1);

  const items = await query<ProductRow>(
    `SELECT ${COLUMNS} FROM products ${clause}
      ORDER BY updated_at DESC, id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );

  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getProductBySku(sku: string): Promise<ProductRow | null> {
  await ensureReady();
  return one<ProductRow>(`SELECT ${COLUMNS} FROM products WHERE lower(sku) = lower($1)`, [sku]);
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  await ensureReady();
  return one<ProductRow>(`SELECT ${COLUMNS} FROM products WHERE slug = $1 AND is_active`, [slug]);
}

export type ProductInput = {
  sku: string;
  slug: string;
  kind: string;
  brand: string;
  model: string;
  mpn: string | null;
  family: string;
  condition: string;
  segment: string;
  price_pkr: number;
  price_on_request: boolean;
  stock_qty: number;
  lead_days: number;
  indent_only: boolean;
  warranty_months: number;
  release_year: number;
  search_key: string;
  highlights: string[];
  tags: string[];
  specs: Record<string, unknown>;
  is_active: boolean;
};

export async function createProduct(p: ProductInput): Promise<ProductRow> {
  await ensureReady();
  const rows = await query<ProductRow>(
    `INSERT INTO products
       (sku, slug, kind, brand, model, mpn, family, condition, segment, price_pkr,
        price_on_request, stock_qty, lead_days, indent_only, warranty_months,
        release_year, search_key, highlights, tags, specs, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING ${COLUMNS}`,
    [
      p.sku, p.slug, p.kind, p.brand, p.model, p.mpn, p.family, p.condition, p.segment,
      p.price_pkr, p.price_on_request, p.stock_qty, p.lead_days, p.indent_only,
      p.warranty_months, p.release_year, p.search_key,
      JSON.stringify(p.highlights), JSON.stringify(p.tags), JSON.stringify(p.specs), p.is_active,
    ],
  );
  return rows[0];
}

/** Only the fields passed are touched, so a partial edit cannot blank the rest. */
export async function updateProduct(sku: string, patch: Partial<ProductInput>): Promise<ProductRow | null> {
  await ensureReady();

  const sets: string[] = [];
  const params: unknown[] = [];
  const json = new Set(["highlights", "tags", "specs"]);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || key === "sku") continue;
    params.push(json.has(key) ? JSON.stringify(value) : value);
    sets.push(`${key} = $${params.length}`);
  }
  if (!sets.length) return getProductBySku(sku);

  sets.push("updated_at = now()");
  params.push(sku);

  const rows = await query<ProductRow>(
    `UPDATE products SET ${sets.join(", ")} WHERE lower(sku) = lower($${params.length}) RETURNING ${COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

/**
 * Retiring is the default. A product named in an old quote has to stay
 * readable, so it is hidden rather than removed unless someone really means it.
 */
export async function retireProduct(sku: string): Promise<void> {
  await ensureReady();
  await query("UPDATE products SET is_active = FALSE, updated_at = now() WHERE lower(sku) = lower($1)", [sku]);
}

export async function restoreProduct(sku: string): Promise<void> {
  await ensureReady();
  await query("UPDATE products SET is_active = TRUE, updated_at = now() WHERE lower(sku) = lower($1)", [sku]);
}

export async function deleteProduct(sku: string): Promise<void> {
  await ensureReady();
  await query("DELETE FROM products WHERE lower(sku) = lower($1)", [sku]);
}

export async function countsByKind(): Promise<Record<string, number>> {
  await ensureReady();
  const rows = await query<{ kind: string; n: string }>(
    "SELECT kind, count(*) AS n FROM products WHERE is_active GROUP BY kind ORDER BY count(*) DESC",
  );
  return Object.fromEntries(rows.map((r) => [r.kind, Number(r.n)]));
}
