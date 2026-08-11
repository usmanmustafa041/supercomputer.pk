/**
 * Exports the generated catalog as JSON for the backend to seed from.
 *
 * The catalog is produced deterministically in TypeScript. Rather than port
 * that generator to Python, it is exported once and imported into Postgres,
 * after which the database is the source of truth and the admin edits rows
 * directly. Run: npm run catalog:export
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { allProducts } from "../src/lib/catalog";
import type { Product } from "../src/lib/catalog";

/** Columns the products table holds as real columns. */
const COLUMNS = new Set([
  "id", "slug", "kind", "brand", "model", "mpn", "family", "condition",
  "segment", "price", "avail", "warrantyMonths", "releaseYear",
  "searchKey", "highlights", "tags",
]);

/** Everything else is a per-category engineering spec and goes into JSONB. */
function specsOf(p: Product): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (!COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

const rows = allProducts().map((p) => ({
  sku: p.id,
  slug: p.slug,
  kind: p.kind,
  brand: p.brand,
  model: p.model,
  mpn: p.mpn,
  family: p.family,
  condition: p.condition,
  segment: p.segment,
  price_pkr: p.price.pkr,
  price_on_request: Boolean(p.price.onRequest),
  stock_qty: p.avail.inHouse,
  lead_days: p.avail.leadDays,
  indent_only: p.avail.indentOnly,
  warranty_months: p.warrantyMonths,
  release_year: p.releaseYear,
  search_key: p.searchKey,
  highlights: p.highlights,
  tags: p.tags,
  specs: specsOf(p),
  is_active: true,
}));

const out = resolve(process.cwd(), "backend/seed/catalog.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows), "utf-8");

const kinds = new Map<string, number>();
for (const r of rows) kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);

console.log(`wrote ${rows.length.toLocaleString()} products to backend/seed/catalog.json`);
console.log([...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${String(n).padStart(5)}  ${k}`).join("\n"));
