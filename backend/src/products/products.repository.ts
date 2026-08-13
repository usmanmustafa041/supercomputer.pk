/**
 * Every SQL statement the products and product_images tables ever see.
 *
 * All of it lives in repositories like this rather than being scattered through
 * controllers, so there is one place to look when a query is slow or wrong, and
 * one place to audit for a statement built by string concatenation. There are
 * none: every value travels as a parameter.
 */

import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { Page, ProductImageRow, ProductRow } from "./product.types";

const COLUMNS = `id, sku, slug, kind, brand, model, mpn, family, condition, segment,
  price_pkr::float8 AS price_pkr, price_on_request, stock_qty, lead_days, indent_only,
  warranty_months, release_year, search_key, highlights, tags, specs, is_active,
  created_at, updated_at,
  (SELECT pi.id FROM product_images pi WHERE pi.sku = products.sku AND pi.verified_at IS NOT NULL ORDER BY pi.position, pi.id LIMIT 1) AS image_id`;

const IMAGE_COLUMNS = `id, sku, object_key, original_name, mime, bytes, width, height, alt, source_url, source_name, source_license, verified_at, position`;

export interface ProductFilter {
  q?: string;
  kind?: string;
  condition?: string;
  inStockOnly?: boolean;
  includeRetired?: boolean;
  page?: number;
  perPage?: number;
}

export interface ProductInput {
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
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly db: DatabaseService) {}

  allActive(): Promise<ProductRow[]> {
    return this.db.query<ProductRow>(`SELECT ${COLUMNS} FROM products WHERE is_active ORDER BY id`);
  }

  findBySkus(skus: string[]): Promise<ProductRow[]> {
    if (!skus.length) return Promise.resolve([]);
    return this.db.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE is_active AND lower(sku) = ANY($1::text[])`,
      [skus.map((sku) => sku.toLowerCase())],
    );
  }

  findByFamilies(families: string[]): Promise<ProductRow[]> {
    if (!families.length) return Promise.resolve([]);
    return this.db.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE is_active AND family = ANY($1::text[]) ORDER BY id`,
      [families],
    );
  }

  async list(f: ProductFilter = {}): Promise<Page<ProductRow>> {
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
    const total = Number(await this.db.scalar<string>(`SELECT count(*) FROM products ${clause}`, params));

    const perPage = Math.min(Math.max(f.perPage ?? 25, 1), 100);
    const page = Math.max(f.page ?? 1, 1);

    const items = await this.db.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products ${clause}
        ORDER BY updated_at DESC, id
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, (page - 1) * perPage],
    );

    return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
  }

  findBySku(sku: string): Promise<ProductRow | null> {
    return this.db.one<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE lower(sku) = lower($1)`,
      [sku],
    );
  }

  findBySlug(slug: string): Promise<ProductRow | null> {
    return this.db.one<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE slug = $1 AND is_active`,
      [slug],
    );
  }

  async create(p: ProductInput): Promise<ProductRow> {
    const rows = await this.db.query<ProductRow>(
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

  /**
   * Only the fields passed are touched, so a partial edit cannot blank the rest.
   *
   * The column names come from a fixed allowlist rather than from the caller's
   * keys. Building `SET ${key} = ...` from request data would be an injection
   * point that no amount of parameterising the values would close.
   */
  async update(sku: string, patch: Partial<ProductInput>): Promise<ProductRow | null> {
    const allowed = new Set<keyof ProductInput>([
      "slug", "kind", "brand", "model", "mpn", "family", "condition", "segment",
      "price_pkr", "price_on_request", "stock_qty", "lead_days", "indent_only",
      "warranty_months", "release_year", "search_key", "highlights", "tags",
      "specs", "is_active",
    ]);
    const json = new Set(["highlights", "tags", "specs"]);

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (!allowed.has(key as keyof ProductInput)) continue;
      params.push(json.has(key) ? JSON.stringify(value) : value);
      sets.push(`${key} = $${params.length}`);
    }
    if (!sets.length) return this.findBySku(sku);

    sets.push("updated_at = now()");
    params.push(sku);

    const rows = await this.db.query<ProductRow>(
      `UPDATE products SET ${sets.join(", ")} WHERE lower(sku) = lower($${params.length}) RETURNING ${COLUMNS}`,
      params,
    );
    return rows[0] ?? null;
  }

  async retire(sku: string): Promise<void> {
    await this.db.query(
      "UPDATE products SET is_active = FALSE, updated_at = now() WHERE lower(sku) = lower($1)",
      [sku],
    );
  }

  async restore(sku: string): Promise<void> {
    await this.db.query(
      "UPDATE products SET is_active = TRUE, updated_at = now() WHERE lower(sku) = lower($1)",
      [sku],
    );
  }

  async remove(sku: string): Promise<void> {
    await this.db.query("DELETE FROM products WHERE lower(sku) = lower($1)", [sku]);
  }

  async countsByKind(): Promise<Record<string, number>> {
    const rows = await this.db.query<{ kind: string; n: string }>(
      "SELECT kind, count(*) AS n FROM products WHERE is_active GROUP BY kind ORDER BY count(*) DESC",
    );
    return Object.fromEntries(rows.map((r) => [r.kind, Number(r.n)]));
  }

  /* ------------------------------------------------------------------ images */

  listImages(sku: string): Promise<ProductImageRow[]> {
    return this.db.query<ProductImageRow>(
      `SELECT ${IMAGE_COLUMNS} FROM product_images WHERE lower(sku) = lower($1) ORDER BY position, id`,
      [sku],
    );
  }

  async countImages(sku: string): Promise<number> {
    return Number(
      await this.db.scalar<string>("SELECT count(*) FROM product_images WHERE lower(sku) = lower($1)", [sku]),
    );
  }

  findImage(id: number): Promise<ProductImageRow | null> {
    return this.db.one<ProductImageRow>(`SELECT ${IMAGE_COLUMNS} FROM product_images WHERE id = $1`, [id]);
  }

  /** Appends to the end of the product's list. Re-uploading the same file is a no-op. */
  async addImage(img: {
    sku: string;
    object_key: string;
    original_name: string | null;
    mime: string;
    bytes: number;
    width: number | null;
    height: number | null;
    source_url?: string | null;
    source_name?: string | null;
    source_license?: string | null;
    verified_at?: Date | null;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO product_images
         (sku, object_key, original_name, mime, bytes, width, height, source_url, source_name, source_license, verified_at, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               $8, $9, $10, $11,
               COALESCE((SELECT max(position) + 1 FROM product_images WHERE sku = $1), 0))
       ON CONFLICT (sku, object_key) DO NOTHING`,
      [img.sku, img.object_key, img.original_name, img.mime, img.bytes, img.width, img.height, img.source_url ?? null, img.source_name ?? null, img.source_license ?? null, img.verified_at ?? null],
    );
  }

  /**
   * Deletes a row and reports whether the object behind it is now unused.
   *
   * Two products can be given the same photograph, and because the key is a
   * content hash they end up sharing one object. So the caller has to know
   * whether anything still points at it before deleting the bytes.
   */
  async deleteImage(id: number): Promise<{ object_key: string; stillReferenced: boolean } | null> {
    const row = await this.db.one<{ object_key: string }>(
      "DELETE FROM product_images WHERE id = $1 RETURNING object_key",
      [id],
    );
    if (!row) return null;

    const left = Number(
      await this.db.scalar<string>("SELECT count(*) FROM product_images WHERE object_key = $1", [row.object_key]),
    );
    return { object_key: row.object_key, stillReferenced: left > 0 };
  }

  async setImageAlt(id: number, alt: string): Promise<void> {
    await this.db.query("UPDATE product_images SET alt = $2 WHERE id = $1", [id, alt || null]);
  }

  /**
   * Moves one photograph up or down its product's list.
   *
   * A swap of two positions inside one statement rather than rewriting the whole
   * ordering, so two administrators reordering at once cannot leave the list
   * half renumbered.
   */
  async moveImage(id: number, direction: "up" | "down"): Promise<void> {
    const comparison = direction === "up" ? "<" : ">";
    const order = direction === "up" ? "DESC" : "ASC";

    await this.db.query(
      `WITH me AS (
         SELECT id, sku, position FROM product_images WHERE id = $1
       ),
       neighbour AS (
         SELECT p.id, p.position
           FROM product_images p, me
          WHERE p.sku = me.sku
            AND (p.position, p.id) ${comparison} (me.position, me.id)
          ORDER BY p.position ${order}, p.id ${order}
          LIMIT 1
       )
       UPDATE product_images p
          SET position = CASE WHEN p.id = me.id THEN neighbour.position ELSE me.position END
         FROM me, neighbour
        WHERE p.id IN (me.id, neighbour.id)`,
      [id],
    );
  }

  /** Of these keys, which no longer have any row pointing at them. */
  async unreferencedKeys(keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.db.query<{ object_key: string }>(
      "SELECT DISTINCT object_key FROM product_images WHERE object_key = ANY($1)",
      [keys],
    );
    const alive = new Set(rows.map((r) => r.object_key));
    return [...new Set(keys)].filter((k) => !alive.has(k));
  }
}
