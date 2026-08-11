import Link from "next/link";
import { api } from "@/lib/api/server";
import type { ProductPage } from "@/lib/api/types";
import { CONDITION_LABEL, KIND_LABEL } from "@/lib/catalog/types";
import { retireProduct, restoreProduct, setStock } from "../actions";

export const metadata = { title: "Products" };

const KINDS = Object.entries(KIND_LABEL);

type Search = { q?: string; kind?: string; page?: string; saved?: string; show?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const hideRetired = sp.show === "listed";

  const params = new URLSearchParams({
    page: String(page),
    per_page: "25",
    include_inactive: String(!hideRetired),
  });
  if (sp.q) params.set("q", sp.q);
  if (sp.kind) params.set("kind", sp.kind);

  let data: ProductPage;
  try {
    data = await api<ProductPage>(`/api/admin/products?${params}`, { auth: true });
  } catch {
    return (
      <div className="shell py-10">
        <p className="panel p-6 text-[14px]">The API is not answering. Check that it is running.</p>
      </div>
    );
  }

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (sp.q) q.set("q", sp.q);
    if (sp.kind) q.set("kind", sp.kind);
    if (sp.show) q.set("show", sp.show);
    if (n > 1) q.set("page", String(n));
    return `/admin/products${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="t-display text-2xl">Products</h1>
          <p className="text-[13px] text-ink-2 mt-0.5">
            {data.total.toLocaleString("en-GB")} matching, page {data.page} of {data.pages}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          Add a product
        </Link>
      </div>

      {sp.saved && (
        <p className="mb-4 text-[13px] text-acc border border-[var(--line-mid)] px-3 py-2">
          Saved {sp.saved}.
        </p>
      )}

      <form className="panel p-3 mb-4 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by name, brand or SKU"
          aria-label="Search products"
          className="field h-9 text-[13px]"
        />
        <select name="kind" defaultValue={sp.kind ?? ""} aria-label="Category" className="field h-9 text-[13px]">
          <option value="">All categories</option>
          {KINDS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select name="show" defaultValue={sp.show ?? ""} aria-label="Visibility" className="field h-9 text-[13px]">
          <option value="">Everything</option>
          <option value="listed">Listed only</option>
        </select>
        <button className="btn btn-sm">Search</button>
      </form>

      {/* One list, two shapes. A five-column table is unreadable on a phone and
          a horizontally scrolling one is worse, so on small screens each
          product becomes a stacked card with the same controls. No second
          component, just where the breakpoints fall. */}
      <div className="panel divide-y divide-[var(--line)]">
        <div className="hidden lg:grid grid-cols-[1fr_9rem_9rem_8.5rem_10rem] gap-3 px-4 py-2.5 text-[12px] text-ink-2">
          <span>Product</span>
          <span>Category</span>
          <span>Condition</span>
          <span>In stock</span>
          <span className="text-right">Actions</span>
        </div>

        {data.items.map((p) => (
          <div
            key={p.id}
            className="grid gap-2 p-4 lg:grid-cols-[1fr_9rem_9rem_8.5rem_10rem] lg:gap-3 lg:items-center lg:py-2.5"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/products/${encodeURIComponent(p.sku)}`}
                className="hover:text-acc transition-colors"
              >
                <span className="block text-[13.5px] leading-snug">
                  {p.brand} {p.model}
                </span>
                <span className="t-data text-[11px] text-ink-3">{p.sku}</span>
              </Link>
              {!p.is_active && <span className="pill pill-warn mt-1 lg:mt-0 lg:ml-2">Retired</span>}
            </div>

            <div className="text-[12.5px] text-ink-2 lg:contents">
              <span className="lg:block">{KIND_LABEL[p.kind as keyof typeof KIND_LABEL] ?? p.kind}</span>
              <span className="lg:hidden"> · </span>
              <span className="lg:block">
                {CONDITION_LABEL[p.condition as keyof typeof CONDITION_LABEL] ?? p.condition}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Restocking is the most frequent edit, so it happens here
                  rather than behind a page load. */}
              <form action={setStock} className="flex items-center gap-1.5">
                <input type="hidden" name="sku" value={p.sku} />
                <label className="sr-only" htmlFor={`stock-${p.id}`}>
                  Units of {p.sku} in stock
                </label>
                <input
                  id={`stock-${p.id}`}
                  name="stock_qty"
                  type="number"
                  min={0}
                  defaultValue={p.stock_qty}
                  className="field h-8 w-20 text-[13px]"
                />
                <button className="btn btn-sm">Set</button>
              </form>

              <div className="flex items-center gap-1.5 lg:hidden">
                <Link href={`/admin/products/${encodeURIComponent(p.sku)}`} className="btn btn-sm">
                  Edit
                </Link>
                <form action={p.is_active ? retireProduct : restoreProduct}>
                  <input type="hidden" name="sku" value={p.sku} />
                  <button className="btn btn-sm">{p.is_active ? "Retire" : "Restore"}</button>
                </form>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-end gap-1.5">
              <Link href={`/admin/products/${encodeURIComponent(p.sku)}`} className="btn btn-sm">
                Edit
              </Link>
              <form action={p.is_active ? retireProduct : restoreProduct}>
                <input type="hidden" name="sku" value={p.sku} />
                <button className="btn btn-sm">{p.is_active ? "Retire" : "Restore"}</button>
              </form>
            </div>
          </div>
        ))}

        {data.items.length === 0 && (
          <p className="p-8 text-center text-ink-2 text-[14px]">Nothing matches that search.</p>
        )}
      </div>

      {data.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-[13px]">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-sm">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-2">
            Page {page} of {data.pages}
          </span>
          {page < data.pages ? (
            <Link href={pageHref(page + 1)} className="btn btn-sm">
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
