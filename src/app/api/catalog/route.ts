import { NextResponse } from "next/server";
import { searchProducts, type Kind, type Product } from "@/lib/catalog";
import { publicProducts } from "@/lib/db/catalog";
import { suggestChassis, type Target } from "@/lib/catalog/fit";

export const runtime = "nodejs";

/**
 * Part feed for the configurator.
 *
 * Returns whole Product objects rather than a slim projection, because the
 * compatibility engine runs in the browser and needs every spec field. Only
 * the requested page travels, so this stays small, 24 parts, not 2,770.
 *
 *   ?kind=gpu&q=5090&page=1     browse/search within a category
 *   ?ids=G-ABC,C-DEF            rehydrate a shared build from the URL
 *   ?families=h100-pcie,l40s    resolve a preset to concrete SKUs
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const products = await publicProducts();
  const byId = new Map(products.map((product) => [product.id.toLowerCase(), product]));
  const getById = (id: string) => byId.get(id.toLowerCase());

  /**
   * ?chassisFor=rack&ids=… , re-home a build into a chassis that suits a new
   * deployment target, keeping every other part. Runs server-side because it
   * scores the whole chassis catalog against the build's real constraints.
   */
  const chassisFor = sp.get("chassisFor") as Target | null;
  if (chassisFor) {
    const lines = (sp.get("ids") ?? "")
      .split(",")
      .filter(Boolean)
      .map((tok) => {
        const [id, qty] = tok.split("*");
        const product = getById(id);
        return product ? { product, qty: Math.max(1, Number(qty ?? 1)) } : null;
      })
      .filter((l): l is { product: Product; qty: number } => l !== null);

    const hit = suggestChassis(
      lines,
      chassisFor,
      products.filter((p): p is Extract<Product, { kind: "chassis" }> => p.kind === "chassis"),
    );
    return NextResponse.json({ chassis: hit?.chassis ?? null, relaxed: hit?.relaxed ?? [] });
  }

  const ids = sp.get("ids");
  if (ids) {
    const items = ids.split(",").map(getById).filter(Boolean) as Product[];
    return NextResponse.json({ items, total: items.length, page: 1, pages: 1 });
  }

  const families = sp.get("families");
  if (families) {
    /**
     * Resolve one SKU per family. `key:hint` pins a variant by substring of
     * the model name, without it a power-supply family resolves to its
     * cheapest, lowest-wattage member and every preset ships undersized.
     */
    const wanted = new Map<string, string | null>();
    for (const token of families.split(",")) {
      const [key, hint] = token.split(":");
      wanted.set(key, hint ?? null);
    }

    const byFamily = new Map<string, Product>();
    for (const kind of ["chassis", "motherboard", "cpu", "cooler", "memory", "gpu", "storage", "psu", "nic", "switch", "optic", "rack", "pdu", "ups"] as Kind[]) {
      for (const p of products.filter((candidate) => candidate.kind === kind)) {
        if (!wanted.has(p.family)) continue;
        const hint = wanted.get(p.family);
        if (hint && !p.model.toLowerCase().includes(hint.toLowerCase())) continue;
        const cur = byFamily.get(p.family);
        if (!cur) { byFamily.set(p.family, p); continue; }
        const better =
          (p.avail.inHouse > 0 ? 0 : 1) - (cur.avail.inHouse > 0 ? 0 : 1) ||
          p.price.pkr - cur.price.pkr;
        if (better < 0) byFamily.set(p.family, p);
      }
    }
    const items = [...byFamily.values()];
    return NextResponse.json({ items, total: items.length, page: 1, pages: 1 });
  }

  // Rack targets only ever want rack-mountable enclosures, and vice versa.
  const forTarget = sp.get("for");
  const rackOnly = forTarget === "rack" || forTarget === "cluster";

  const res = searchProducts(products, {
    kind: sp.get("kind") ? [sp.get("kind") as Kind] : undefined,
    text: sp.get("q") ?? undefined,
    page: Number(sp.get("page") ?? 1),
    perPage: 24,
    sort: (sp.get("sort") as "price-asc" | "perf" | undefined) ?? "perf",
    inStockOnly: sp.get("stock") === "1",
  });

  const items =
    forTarget && sp.get("kind") === "chassis"
      ? res.items.filter((p) => p.kind === "chassis" && (p.rackU > 0) === rackOnly)
      : res.items;

  return NextResponse.json({
    items,
    total: res.total,
    page: res.page,
    pages: res.pages,
    facets: { brand: res.facets.brand.slice(0, 10) },
  });
}
