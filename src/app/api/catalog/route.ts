import { NextResponse } from "next/server";
import { getById, getByKind, search, type Kind, type Product } from "@/lib/catalog";
import { suggestChassis, type Target } from "@/lib/catalog/fit";

export const runtime = "nodejs";

/**
 * Part feed for the configurator.
 *
 * Returns whole Product objects rather than a slim projection, because the
 * compatibility engine runs in the browser and needs every spec field. Only
 * the requested page travels, so this stays small — 24 parts, not 2,770.
 *
 *   ?kind=gpu&q=5090&page=1     browse/search within a category
 *   ?ids=G-ABC,C-DEF            rehydrate a shared build from the URL
 *   ?families=h100-pcie,l40s    resolve a preset to concrete SKUs
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  /**
   * ?chassisFor=rack&ids=…  — re-home a build into a chassis that suits a new
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

    const hit = suggestChassis(lines, chassisFor);
    return NextResponse.json({ chassis: hit?.chassis ?? null, relaxed: hit?.relaxed ?? [] });
  }

  const ids = sp.get("ids");
  if (ids) {
    const items = ids.split(",").map(getById).filter(Boolean) as Product[];
    return NextResponse.json({ items, total: items.length, page: 1, pages: 1 });
  }

  const families = sp.get("families");
  if (families) {
    // Pick one representative SKU per family: the cheapest that we can
    // actually supply, preferring stock we hold over an indent line.
    const wanted = new Set(families.split(","));
    const byFamily = new Map<string, Product>();
    for (const kind of ["chassis", "motherboard", "cpu", "cooler", "memory", "gpu", "storage", "psu", "nic", "switch", "optic", "rack", "pdu", "ups"] as Kind[]) {
      for (const p of getByKind(kind)) {
        if (!wanted.has(p.family)) continue;
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

  const res = search({
    kind: sp.get("kind") ? [sp.get("kind") as Kind] : undefined,
    text: sp.get("q") ?? undefined,
    page: Number(sp.get("page") ?? 1),
    perPage: 24,
    sort: (sp.get("sort") as "price-asc" | "perf" | undefined) ?? "perf",
    inStockOnly: sp.get("stock") === "1",
  });

  return NextResponse.json({
    items: res.items,
    total: res.total,
    page: res.page,
    pages: res.pages,
    facets: { brand: res.facets.brand.slice(0, 10) },
  });
}
