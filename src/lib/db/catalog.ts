/** Public catalog reads backed exclusively by PostgreSQL. */

import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { KIND_LABEL, searchProducts, type Kind, type Product, type Query } from "@/lib/catalog";
import { ensureReady } from "./init";
import { query } from "./client";
import type { ProductRow } from "./types";

const PUBLIC_COLUMNS = `id, sku, slug, kind, brand, model, mpn, family, condition, segment,
  price_pkr::float8 AS price_pkr, price_on_request, stock_qty, lead_days, indent_only,
  warranty_months, release_year, search_key, highlights, tags, media, specs, is_active,
  created_at, updated_at`;

export function productFromRow(row: ProductRow): Product {
  return {
    ...row.specs,
    id: row.sku,
    slug: row.slug,
    kind: row.kind,
    brand: row.brand,
    model: row.model,
    mpn: row.mpn ?? row.sku,
    family: row.family,
    condition: row.condition,
    segment: row.segment,
    price: { pkr: Number(row.price_pkr), onRequest: row.price_on_request || undefined },
    avail: { inHouse: row.stock_qty, leadDays: row.lead_days, indentOnly: row.indent_only },
    warrantyMonths: row.warranty_months,
    releaseYear: row.release_year,
    searchKey: row.search_key,
    highlights: row.highlights,
    tags: row.tags,
    productMedia: row.media,
  } as Product;
}

/** React cache deduplicates multiple reads during one server render/request. */
export const publicProducts = cache(async (): Promise<Product[]> => {
  await connection();
  await ensureReady();
  const rows = await query<ProductRow>(
    `SELECT ${PUBLIC_COLUMNS} FROM products WHERE is_active ORDER BY id`,
  );
  return rows.map(productFromRow);
});

export async function publicProductById(id: string): Promise<Product | undefined> {
  return (await publicProducts()).find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export async function publicProductBySlug(slug: string): Promise<Product | undefined> {
  return (await publicProducts()).find((p) => p.slug === slug);
}

export async function publicProductsByKind<K extends Kind>(kind: K): Promise<Array<Extract<Product, { kind: K }>>> {
  return (await publicProducts()).filter((p): p is Extract<Product, { kind: K }> => p.kind === kind);
}

export async function publicProductFamily(family: string): Promise<Product[]> {
  return (await publicProducts()).filter((p) => p.family === family);
}

export async function publicKindCounts() {
  const products = await publicProducts();
  return (Object.keys(KIND_LABEL) as Kind[]).map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    count: products.filter((p) => p.kind === kind).length,
  }));
}

export async function searchPublicProducts(filters: Query) {
  return searchProducts(await publicProducts(), filters);
}
