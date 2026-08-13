/**
 * Everything the application does with products, as opposed to how it is
 * stored (the repository) or how it is asked for (the controller).
 *
 * The split earns its keep in the delete path: removing a product has to take
 * its image rows, and then work out which objects in the bucket nothing points
 * at any more. That is a rule about the business, not about SQL or HTTP, so it
 * lives here.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { searchProducts, type Product } from "@supercomputers/shared";
import { StorageService, MAX_UPLOAD_BYTES } from "../storage/storage.service";
import { ProductsRepository, type ProductFilter, type ProductInput } from "./products.repository";
import type { Page, ProductImageRow, ProductRow } from "./product.types";
import { AuditService } from "../audit.service";

export const MAX_IMAGES_PER_PRODUCT = 12;
export const MAX_UPLOAD_BATCH_BYTES = 32 * 1024 * 1024;

/** JSONB specs are flexible, but physical quantities can never be negative. */
function assertNonNegativeSpecs(value: unknown, path = "specs"): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException(`${path} must be a finite, non-negative number.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNonNegativeSpecs(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) assertNonNegativeSpecs(item, `${path}.${key}`);
  }
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  list(filter: ProductFilter): Promise<Page<ProductRow>> {
    return this.repo.list(filter);
  }

  async catalogSearch(query: Parameters<typeof searchProducts>[1]) {
    const rows = await this.repo.allActive();
    return searchProducts(rows.map((row) => this.toDomain(row)), query);
  }

  async catalogProducts(ids: string[]): Promise<Product[]> {
    const rows = await this.repo.findBySkus(ids);
    return rows.map((row) => this.toDomain(row));
  }

  async catalogBySlug(slug: string): Promise<Product> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException("Product not found");
    return this.toDomain(row);
  }

  async catalogFamilies(families: string[]): Promise<Product[]> {
    const rows = await this.repo.findByFamilies(families);
    return rows.map((row) => this.toDomain(row));
  }

  async allCatalogProducts(): Promise<Product[]> {
    const rows = await this.repo.allActive();
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: ProductRow): Product {
    const specs = row.specs && typeof row.specs === "object" ? row.specs : {};
    return {
      ...specs,
      id: row.sku,
      slug: row.slug,
      kind: row.kind,
      brand: row.brand,
      model: row.model,
      mpn: row.mpn ?? row.sku,
      family: row.family,
      condition: row.condition === "tested-pull" ? "pull" : row.condition,
      segment: row.segment,
      price: { pkr: row.price_pkr, onRequest: row.price_on_request },
      avail: { inHouse: row.stock_qty, leadDays: row.lead_days, indentOnly: row.indent_only },
      warrantyMonths: row.warranty_months,
      releaseYear: row.release_year,
      highlights: row.highlights,
      tags: row.tags,
      searchKey: row.search_key,
    } as Product;
  }

  async bySku(sku: string): Promise<ProductRow> {
    const row = await this.repo.findBySku(sku);
    if (!row) throw new NotFoundException(`No product with SKU ${sku}.`);
    return row;
  }

  async bySlug(slug: string): Promise<ProductRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException("No such product.");
    return row;
  }

  counts(): Promise<Record<string, number>> {
    return this.repo.countsByKind();
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async create(input: Partial<ProductInput> & { sku: string; brand: string; model: string; kind: string }): Promise<ProductRow> {
    assertNonNegativeSpecs(input.specs ?? {});
    const sku = input.sku.trim().toUpperCase();
    if (await this.repo.findBySku(sku)) {
      throw new BadRequestException(`A product with SKU ${sku} already exists.`);
    }

    const created = await this.repo.create({
      sku,
      slug: input.slug?.trim() || this.slugify(`${input.brand}-${input.model}-${sku}`),
      kind: input.kind,
      brand: input.brand.trim(),
      model: input.model.trim(),
      mpn: input.mpn ?? null,
      family: input.family ?? "",
      condition: input.condition ?? "new",
      segment: input.segment ?? "datacenter",
      price_pkr: input.price_pkr ?? 0,
      price_on_request: input.price_on_request ?? true,
      stock_qty: input.stock_qty ?? 0,
      lead_days: input.lead_days ?? 0,
      indent_only: input.indent_only ?? false,
      warranty_months: input.warranty_months ?? 12,
      release_year: input.release_year ?? new Date().getFullYear(),
      search_key: `${input.brand} ${input.model} ${sku}`.toLowerCase(),
      highlights: input.highlights ?? [],
      tags: input.tags ?? [],
      specs: input.specs ?? {},
      is_active: input.is_active ?? true,
    });
    await this.audit.record(null, "product_created", "product", created.sku);
    return created;
  }

  async update(sku: string, patch: Partial<ProductInput>): Promise<ProductRow> {
    if (patch.specs !== undefined) assertNonNegativeSpecs(patch.specs);
    // Kept in step automatically: a rename that left search_key behind would
    // make the product unfindable by its own new name.
    if (patch.brand || patch.model) {
      const current = await this.bySku(sku);
      const brand = patch.brand ?? current.brand;
      const model = patch.model ?? current.model;
      patch.search_key = `${brand} ${model} ${sku}`.toLowerCase();
    }

    const row = await this.repo.update(sku, patch);
    if (!row) throw new NotFoundException(`No product with SKU ${sku}.`);
    await this.audit.record(null, "product_updated", "product", row.sku, { fields: Object.keys(patch) });
    return row;
  }

  retire(sku: string): Promise<void> {
    return this.repo.retire(sku).then(() => this.audit.record(null, "product_retired", "product", sku));
  }

  restore(sku: string): Promise<void> {
    return this.repo.restore(sku).then(() => this.audit.record(null, "product_restored", "product", sku));
  }

  /**
   * Really deletes, and cleans up after itself.
   *
   * The foreign key takes the image rows with the product, but the database has
   * never heard of the object store. So the keys are collected first, then
   * whatever nothing points at any more is deleted from the bucket.
   */
  async remove(sku: string): Promise<void> {
    const keys = (await this.repo.listImages(sku)).map((i) => i.object_key);
    await this.repo.remove(sku);
    await this.audit.record(null, "product_deleted", "product", sku);
    for (const key of await this.repo.unreferencedKeys(keys)) {
      await this.storage.deleteObject(key);
    }
  }

  /* ------------------------------------------------------------------ images */

  listImages(sku: string): Promise<ProductImageRow[]> {
    return this.repo.listImages(sku);
  }

  async listPublicImages(sku: string): Promise<Array<Omit<ProductImageRow, "object_key" | "original_name">>> {
    const images = await this.repo.listImages(sku);
    return images.map(({ object_key: _key, original_name: _name, ...publicImage }) => publicImage);
  }

  /**
   * Stores uploaded photographs against a product.
   *
   * One bad file out of five should not throw the other four away, so each is
   * handled on its own and the failures are reported together.
   */
  async addImages(
    sku: string,
    files: Array<{ buffer: Buffer; originalname?: string }>,
  ): Promise<{ added: number; errors: string[] }> {
    const product = await this.bySku(sku);
    if (files.length === 0) throw new BadRequestException("No files were uploaded.");
    if (files.reduce((total, file) => total + file.buffer.length, 0) > MAX_UPLOAD_BATCH_BYTES) {
      throw new BadRequestException("The total upload is too large. Try fewer or smaller images.");
    }

    const room = MAX_IMAGES_PER_PRODUCT - (await this.repo.countImages(product.sku));
    if (room <= 0) {
      throw new BadRequestException(
        `This product already has the maximum of ${MAX_IMAGES_PER_PRODUCT} photos. Remove one first.`,
      );
    }
    if (files.length > room) {
      throw new BadRequestException(
        `Only ${room} more photo${room === 1 ? "" : "s"} will fit. You sent ${files.length}.`,
      );
    }

    const errors: string[] = [];
    let added = 0;

    for (const file of files) {
      if (file.buffer.length > MAX_UPLOAD_BYTES) {
        errors.push(`${file.originalname ?? "A file"} is larger than 8MB.`);
        continue;
      }
      const stored = await this.storage.putImage(file.buffer);
      if ("error" in stored) {
        errors.push(`${file.originalname ?? "A file"}: ${stored.error}`);
        continue;
      }
      await this.repo.addImage({
        sku: product.sku,
        object_key: stored.key,
        original_name: file.originalname?.slice(0, 200) ?? null,
        mime: stored.mime,
        bytes: stored.bytes,
        width: stored.width,
        height: stored.height,
      });
      added++;
    }

    return { added, errors };
  }

  async removeImage(id: number): Promise<void> {
    const removed = await this.repo.deleteImage(id);
    if (!removed) throw new NotFoundException("No such photograph.");
    if (!removed.stillReferenced) await this.storage.deleteObject(removed.object_key);
  }

  async setImageAlt(id: number, alt: string): Promise<void> {
    await this.repo.setImageAlt(id, alt.trim().slice(0, 200));
  }

  async moveImage(id: number, direction: "up" | "down"): Promise<void> {
    await this.repo.moveImage(id, direction);
  }

  /** Streams an object out of the bucket, by the key recorded on a row. */
  async openImage(id: number) {
    const row = await this.repo.findImage(id);
    if (!row) return null;
    return this.storage.getObject(row.object_key);
  }
}
