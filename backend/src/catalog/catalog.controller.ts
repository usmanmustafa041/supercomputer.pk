/**
 * The generated catalogue, as the configurator needs it.
 *
 * This is a read-only view over the shared domain package rather than over the
 * database. Nothing here touches Postgres: the catalogue is a pure function of
 * the family definitions, so the API and the browser would compute the same
 * answer and a round trip to the database would add nothing but latency.
 *
 * Whole Product objects are returned rather than a slim projection, because the
 * compatibility engine runs in the browser and needs every specification field.
 * Only the requested page travels, so a response is 24 parts, not 2,781.
 */

import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  suggestChassis,
  type Kind,
  type Product,
  type Target,
} from "@supercomputers/shared";
import { Public } from "../common/decorators";
import { ProductsService } from "../products/products.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly products: ProductsService) {}
  /** ?kind=gpu&q=5090&page=1 , browse or search within a category. */
  @Public()
  @Get()
  browse(
    @Query("kind") kind?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("sort") sort?: string,
    @Query("stock") stock?: string,
    @Query("condition") condition?: string,
    @Query("segment") segment?: string,
    @Query("brand") brand?: string,
    @Query("tags") tags?: string,
    @Query("min") min?: string,
    @Query("max") max?: string,
    @Query("for") forTarget?: string,
  ) {
    return this.products.catalogSearch({
      kind: kind ? [kind as Kind] : undefined,
      text: q || undefined,
      page: Number(page ?? 1),
      perPage: 24,
      sort: (sort as "price-asc" | "perf" | undefined) ?? "perf",
      inStockOnly: stock === "1",
      condition: condition ? condition.split(",") as never : undefined,
      segment: segment ? segment.split(",") as never : undefined,
      brand: brand ? brand.split(",") : undefined,
      tags: tags ? tags.split(",") : undefined,
      minPkr: min ? Number(min) : undefined,
      maxPkr: max ? Number(max) : undefined,
    });
  }

  @Public()
  @Get("slug/:slug")
  bySlug(@Param("slug") slug: string) {
    return this.products.catalogBySlug(slug);
  }

  /** ?ids=G-ABC,C-DEF , rehydrate a configuration shared as a URL. */
  @Public()
  @Get("by-ids")
  byIds(@Query("ids") ids?: string) {
    const wanted = (ids ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 200);
    return this.products.catalogProducts(wanted).then((items) => ({ items, total: items.length, page: 1, pages: 1 }));
  }

  /** ?families=l40s,corsair-ax:1600W , resolve a preset to concrete SKUs. */
  @Public()
  @Get("families")
  async families(@Query("families") families?: string) {
    const keys = (families ?? "").split(",").filter(Boolean).slice(0, 60).map((token) => token.split(":")[0]);
    const items = await this.products.catalogFamilies(keys);
    return { items, total: items.length, page: 1, pages: 1 };
  }

  /**
   * ?for=rack&ids=… , re-home a configuration into an enclosure that suits a
   * new deployment target, keeping every other part. Server-side because it
   * scores the whole chassis catalogue against the build's real constraints.
   */
  @Public()
  @Get("chassis-for")
  async chassisFor(@Query("for") target: string, @Query("ids") ids?: string) {
    const catalog = await this.products.allCatalogProducts();
    const lines = (ids ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 200)
      .map((token) => {
        const [id, qty] = token.split("*");
        const product = catalog.find((candidate) => candidate.id === id);
        return product ? { product, qty: Math.max(1, Number(qty ?? 1)) } : null;
      })
      .filter((l): l is { product: Product; qty: number } => l !== null);

    const hit = suggestChassis(lines, target as Target);
    return { chassis: hit?.chassis ?? null, relaxed: hit?.relaxed ?? [] };
  }
}
