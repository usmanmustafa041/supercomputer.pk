import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/catalog/ProductCard";
import {
  CONDITION_LABEL, KIND_LABEL, catalogSize, fmtPkr, search,
  type Condition, type Kind, type Query, type Segment,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Every part we sell, filterable by category, condition, brand and budget.",
};

type SP = Record<string, string | string[] | undefined>;

const asArray = (v: string | string[] | undefined): string[] =>
  v == null ? [] : Array.isArray(v) ? v.flatMap((s) => s.split(",")) : v.split(",").filter(Boolean);

const SORTS: Array<[NonNullable<Query["sort"]>, string]> = [
  ["perf", "Capability"],
  ["price-asc", "Price, low first"],
  ["price-desc", "Price, high first"],
  ["newest", "Newest"],
  ["relevance", "Relevance"],
];

/** Builds a URL with one facet value toggled on or off. */
function toggleHref(sp: SP, key: string, value: string): string {
  const current = asArray(sp[key]);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === key || k === "page") continue;
    const vals = asArray(v);
    if (vals.length) params.set(k, vals.join(","));
  }
  if (next.length) params.set(key, next.join(","));
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

function pageHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    const vals = asArray(v);
    if (vals.length) params.set(k, vals.join(","));
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

function Facet({
  title, options, sp, param, labeller,
}: {
  title: string;
  options: Array<[string, number]>;
  sp: SP;
  param: string;
  labeller?: (v: string) => string;
}) {
  if (!options.length) return null;
  const active = asArray(sp[param]);
  return (
    <section className="border-b border-[var(--line)] py-4">
      <h3 className="t-label mb-2.5">{title}</h3>
      <ul className="space-y-0.5">
        {options.slice(0, 12).map(([value, n]) => {
          const on = active.includes(value);
          return (
            <li key={value}>
              <Link
                href={toggleHref(sp, param, value)}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 text-[12.5px] transition-colors ${
                  on ? "bg-acc/10 text-acc" : "text-ink-1 hover:text-ink hover:bg-[var(--wash)]"
                }`}
                scroll={false}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-3 h-3 border shrink-0 ${on ? "bg-acc border-acc" : "border-[var(--line-hi)]"}`}
                    aria-hidden
                  />
                  <span className="truncate">{labeller ? labeller(value) : value}</span>
                </span>
                <span className="t-data text-[10.5px] text-ink-3 tabular-nums shrink-0">{n}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  const q: Query = {
    kind: asArray(sp.kind) as Kind[],
    condition: asArray(sp.condition) as Condition[],
    segment: asArray(sp.segment) as Segment[],
    brand: asArray(sp.brand),
    tags: asArray(sp.tags),
    text: typeof sp.q === "string" ? sp.q : undefined,
    inStockOnly: sp.stock === "1",
    minPkr: sp.min ? Number(sp.min) : undefined,
    maxPkr: sp.max ? Number(sp.max) : undefined,
    sort: (typeof sp.sort === "string" ? sp.sort : undefined) as Query["sort"],
    page: sp.page ? Number(sp.page) : 1,
    perPage: 36,
  };

  const res = search(q);
  const activeCount =
    q.kind!.length + q.condition!.length + q.segment!.length + q.brand!.length + q.tags!.length + (q.inStockOnly ? 1 : 0);

  const heading =
    q.kind?.length === 1 ? KIND_LABEL[q.kind[0]] : q.text ? `Results for “${q.text}”` : "Full catalog";

  return (
    <div className="shell py-9 md:py-12">
      <header className="mb-8">
        <p className="t-eyebrow mb-2.5">
          {res.total.toLocaleString()} of {catalogSize().toLocaleString()} SKUs
        </p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">{heading}</h1>
      </header>

      <div className="grid lg:grid-cols-[15rem_1fr] gap-8">
        {/* ------------------------------------------------------------ facets */}
        <aside className="lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto no-bar">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <h2 className="t-label">Filters{activeCount > 0 && ` · ${activeCount}`}</h2>
            {activeCount > 0 && (
              <Link href="/catalog" className="t-data text-[11px] text-acc hover:underline">
                Clear
              </Link>
            )}
          </div>

          <section className="border-b border-[var(--line)] py-4">
            <Link
              href={toggleHref(sp, "stock", "1")}
              className={`flex items-center gap-2 px-2 py-1.5 -mx-2 text-[12.5px] transition-colors ${
                q.inStockOnly ? "bg-acc/10 text-acc" : "text-ink-1 hover:text-ink hover:bg-[var(--wash)]"
              }`}
              scroll={false}
            >
              <span className={`w-3 h-3 border shrink-0 ${q.inStockOnly ? "bg-acc border-acc" : "border-[var(--line-hi)]"}`} aria-hidden />
              In our own stock only
            </Link>
          </section>

          <Facet title="Category" param="kind" options={res.facets.kind} sp={sp} labeller={(v) => KIND_LABEL[v as Kind]} />
          <Facet title="Condition" param="condition" options={res.facets.condition} sp={sp} labeller={(v) => CONDITION_LABEL[v as Condition]} />
          <Facet title="Segment" param="segment" options={res.facets.segment} sp={sp} labeller={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
          <Facet title="Brand" param="brand" options={res.facets.brand} sp={sp} />
          <Facet title="Attributes" param="tags" options={res.facets.tags} sp={sp} labeller={(v) => v.replace(/-/g, " ")} />
        </aside>

        {/* ----------------------------------------------------------- results */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[var(--line)]">
            <p className="t-data text-[12px] text-ink-2">
              Page {res.page} of {res.pages}
              {res.total > 0 && (
                <>
                  {" · "}
                  {fmtPkr(Math.min(...res.items.map((i) => i.price.pkr)))} —{" "}
                  {fmtPkr(Math.max(...res.items.map((i) => i.price.pkr)))} on this page
                </>
              )}
            </p>
            <nav className="flex items-center gap-1" aria-label="Sort">
              <span className="t-label mr-1.5">Sort</span>
              {SORTS.map(([value, label]) => {
                const params = new URLSearchParams();
                for (const [k, v] of Object.entries(sp)) {
                  if (k === "sort" || k === "page") continue;
                  const vals = asArray(v);
                  if (vals.length) params.set(k, vals.join(","));
                }
                params.set("sort", value);
                const on = (q.sort ?? "perf") === value;
                return (
                  <Link
                    key={value}
                    href={`/catalog?${params.toString()}`}
                    scroll={false}
                    className={`px-2.5 py-1 t-data text-[11px] border transition-colors ${
                      on ? "border-acc text-acc bg-acc/10" : "border-[var(--line)] text-ink-2 hover:text-ink hover:border-[var(--line-hi)]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {res.items.length === 0 ? (
            <div className="panel p-10 text-center">
              <h2 className="t-display text-[22px]">Nothing matches that combination</h2>
              <p className="text-[13.5px] text-ink-1 mt-3 max-w-md mx-auto leading-relaxed">
                The filters are ANDed together, so a narrow set of attributes can easily exclude everything.
                Try removing the most specific one.
              </p>
              <Link href="/catalog" className="btn btn-ghost mt-6">
                Reset filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {res.items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}

          {res.pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-1.5 flex-wrap" aria-label="Pagination">
              {res.page > 1 && (
                <Link href={pageHref(sp, res.page - 1)} className="btn btn-ghost btn-sm">
                  Previous
                </Link>
              )}
              {Array.from({ length: Math.min(7, res.pages) }).map((_, i) => {
                const start = Math.max(1, Math.min(res.page - 3, res.pages - 6));
                const n = start + i;
                if (n > res.pages) return null;
                return (
                  <Link
                    key={n}
                    href={pageHref(sp, n)}
                    className={`btn btn-sm ${n === res.page ? "btn-primary" : "btn-ghost"}`}
                    aria-current={n === res.page ? "page" : undefined}
                  >
                    {n}
                  </Link>
                );
              })}
              {res.page < res.pages && (
                <Link href={pageHref(sp, res.page + 1)} className="btn btn-ghost btn-sm">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
