/** Query surface over the expanded catalog. Indexes are built lazily, once. */

import { allProducts } from "./expand";
import { KIND_LABEL, type Condition, type Kind, type Product, type Segment } from "./types";

export * from "./types";
export { allProducts, FX_USD_PKR, slugify } from "./expand";

/* ----------------------------------------------------------------- indexes */

let bySlug: Map<string, Product> | null = null;
let byId: Map<string, Product> | null = null;
let byKind: Map<Kind, Product[]> | null = null;
let byFamily: Map<string, Product[]> | null = null;

function build() {
  if (bySlug) return;
  bySlug = new Map();
  byId = new Map();
  byKind = new Map();
  byFamily = new Map();
  for (const p of allProducts()) {
    bySlug.set(p.slug, p);
    byId.set(p.id, p);
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind)!.push(p);
    if (!byFamily.has(p.family)) byFamily.set(p.family, []);
    byFamily.get(p.family)!.push(p);
  }
}

export function getBySlug(slug: string): Product | undefined {
  build();
  return bySlug!.get(slug);
}

export function getById(id: string): Product | undefined {
  build();
  return byId!.get(id);
}

/** Narrowed by kind, so callers get `System[]` rather than `Product[]`. */
export function getByKind<K extends Kind>(kind: K): Array<Extract<Product, { kind: K }>> {
  build();
  return (byKind!.get(kind) ?? []) as Array<Extract<Product, { kind: K }>>;
}

/** Sibling SKUs from the same underlying part, other grades, other partners. */
export function getFamily(family: string): Product[] {
  build();
  return byFamily!.get(family) ?? [];
}

export function catalogSize(): number {
  return allProducts().length;
}

export function kindCounts(): Array<{ kind: Kind; label: string; count: number }> {
  build();
  return (Object.keys(KIND_LABEL) as Kind[]).map((k) => ({
    kind: k,
    label: KIND_LABEL[k],
    count: byKind!.get(k)?.length ?? 0,
  }));
}

/* ------------------------------------------------------------------ search */

export interface Query {
  kind?: Kind[];
  condition?: Condition[];
  segment?: Segment[];
  brand?: string[];
  tags?: string[];
  minPkr?: number;
  maxPkr?: number;
  /** Only SKUs we physically hold. */
  inStockOnly?: boolean;
  text?: string;
  sort?: "relevance" | "price-asc" | "price-desc" | "newest" | "perf";
  page?: number;
  perPage?: number;
}

/** Cheap scoring: token hits in model/brand/tags. Good enough at this size. */
function score(p: Product, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = `${p.brand} ${p.model} ${p.mpn} ${p.tags.join(" ")} ${p.kind}`.toLowerCase();
  let n = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return -1; // every token must appear somewhere
    if (p.model.toLowerCase().includes(t)) n += 3;
    else if (p.brand.toLowerCase().includes(t)) n += 2;
    else n += 1;
  }
  return n;
}

/**
 * Default browse ordering. Raw capability alone floats SXM and OAM modules to
 * the top of every GPU page, and you cannot buy one of those on its own, they
 * only ship attached to an HGX or UBB baseboard. Demote what a customer cannot
 * actually deploy standalone so the first screen is useful.
 */
function browseRank(p: Product): number {
  const base = perfOf(p);
  if (p.kind === "gpu" && p.formFactor !== "pcie") return base * 0.3;
  return base;
}

/** Rough cross-kind performance number, used by the sorts above. */
function perfOf(p: Product): number {
  switch (p.kind) {
    case "gpu": return p.bf16Tflops || p.fp32Tflops;
    case "cpu": return p.cores * p.boostGhz;
    case "system": return p.bf16Tflops || p.coresTotal;
    case "storage": return p.readMbs;
    case "nic": return p.portGbps * p.ports;
    case "switch": return p.switchingTbps * 1000;
    case "psu": return p.wattage;
    case "memory": return p.moduleGb * p.modules;
    default: return 0;
  }
}

export interface SearchResult {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  /** Facet counts computed against the filtered set, minus each facet itself. */
  facets: {
    kind: Array<[string, number]>;
    brand: Array<[string, number]>;
    condition: Array<[string, number]>;
    segment: Array<[string, number]>;
    tags: Array<[string, number]>;
  };
}

export function search(q: Query): SearchResult {
  const tokens = (q.text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const perPage = q.perPage ?? 36;
  const page = Math.max(1, q.page ?? 1);

  let items = allProducts().filter((p) => {
    if (q.kind?.length && !q.kind.includes(p.kind)) return false;
    if (q.condition?.length && !q.condition.includes(p.condition)) return false;
    if (q.segment?.length && !q.segment.includes(p.segment)) return false;
    if (q.brand?.length && !q.brand.includes(p.brand)) return false;
    if (q.tags?.length && !q.tags.every((t) => p.tags.includes(t))) return false;
    if (q.minPkr != null && p.price.pkr < q.minPkr) return false;
    if (q.maxPkr != null && p.price.pkr > q.maxPkr) return false;
    if (q.inStockOnly && p.avail.inHouse <= 0) return false;
    if (tokens.length && score(p, tokens) < 0) return false;
    return true;
  });

  const facets = {
    kind: count(items, (p) => [p.kind]),
    brand: count(items, (p) => [p.brand]),
    condition: count(items, (p) => [p.condition]),
    segment: count(items, (p) => [p.segment]),
    tags: count(items, (p) => p.tags).slice(0, 28),
  };

  const sort = q.sort ?? (tokens.length ? "relevance" : "perf");
  items = [...items].sort((a, b) => {
    switch (sort) {
      case "price-asc": return a.price.pkr - b.price.pkr;
      case "price-desc": return b.price.pkr - a.price.pkr;
      case "newest": return b.releaseYear - a.releaseYear || b.price.pkr - a.price.pkr;
      case "perf": return browseRank(b) - browseRank(a) || a.price.pkr - b.price.pkr;
      default: return score(b, tokens) - score(a, tokens) || browseRank(b) - browseRank(a);
    }
  });

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    pages,
    facets,
  };
}

function count(items: Product[], get: (p: Product) => string[]): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const p of items) for (const v of get(p)) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/* ------------------------------------------------------------- formatting */

const PKR = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function fmtPkr(n: number): string {
  return PKR.format(n).replace("PKR", "PKR ");
}

/** Pakistani lakh/crore grouping, which is how these prices get discussed. */
export function fmtPkrShort(n: number): string {
  if (n >= 10_000_000) return `PKR ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `PKR ${(n / 100_000).toFixed(2)} Lac`;
  return fmtPkr(n);
}

export function fmtNum(n: number, unit = ""): string {
  const s = n >= 1000 ? n.toLocaleString("en-US") : String(Math.round(n * 100) / 100);
  return unit ? `${s} ${unit}` : s;
}
