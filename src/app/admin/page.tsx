import Link from "next/link";
import { api } from "@/lib/api/server";
import { QUOTE_STATUS_LABEL, type Quote, type QuotePage, type Stats } from "@/lib/api/types";
import { KIND_LABEL } from "@/lib/catalog/types";

export const metadata = { title: "Overview" };

function Figure({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="panel p-5">
      <div className="t-display text-3xl tabular-nums">{n.toLocaleString("en-GB")}</div>
      <div className="text-[13px] mt-1">{label}</div>
      {sub && <div className="text-[12px] text-ink-3 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function AdminHome() {
  let stats: Stats | null = null;
  let recent: Quote[] = [];
  try {
    stats = await api<Stats>("/api/admin/stats", { auth: true });
    recent = (await api<QuotePage>("/api/admin/quotes?per_page=6", { auth: true })).items;
  } catch {
    return (
      <div className="shell py-10">
        <p className="panel p-6 text-[14px]">
          The API is not answering. Check that it is running, then reload.
        </p>
      </div>
    );
  }

  const topKinds = Object.entries(stats.by_kind)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="shell py-8 sm:py-10">
      <h1 className="t-display text-2xl mb-6">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Figure
          n={stats.products_active}
          label="Products listed"
          sub={`${stats.products_total.toLocaleString("en-GB")} including retired`}
        />
        <Figure n={stats.products_in_stock} label="In stock now" />
        <Figure
          n={stats.quotes_new}
          label="New requests"
          sub={`${stats.quotes_total.toLocaleString("en-GB")} all time`}
        />
        <Figure n={stats.users_total} label="Accounts" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-label">Latest requests</h2>
            <Link href="/admin/quotes" className="text-[13px] text-acc hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="panel p-5 text-[14px] text-ink-2">No requests yet.</p>
          ) : (
            <ul className="grid gap-2">
              {recent.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/admin/quotes/${q.reference}`}
                    className="panel p-3.5 flex items-center gap-3 hover:border-[var(--line-mid)] transition-colors"
                  >
                    <span className="t-data text-[12px]">{q.reference}</span>
                    <span className="text-[13px] truncate">{q.contact_name}</span>
                    <span className={`pill ml-auto shrink-0 ${q.status === "new" ? "pill-cool" : ""}`}>
                      {QUOTE_STATUS_LABEL[q.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-label">Products by category</h2>
            <Link href="/admin/products" className="text-[13px] text-acc hover:underline">
              Manage
            </Link>
          </div>
          <div className="panel p-4 grid gap-1.5">
            {topKinds.map(([kind, n]) => (
              <Link
                key={kind}
                href={`/admin/products?kind=${kind}`}
                className="flex items-center gap-3 text-[13px] py-0.5 hover:text-acc transition-colors"
              >
                <span className="w-28 shrink-0 truncate" title={kind}>
                  {KIND_LABEL[kind as keyof typeof KIND_LABEL] ?? kind}
                </span>
                <span className="flex-1 h-1 bg-[var(--line)]">
                  <span
                    className="block h-full bg-acc"
                    style={{ width: `${(n / topKinds[0][1]) * 100}%` }}
                  />
                </span>
                <span className="tabular-nums text-ink-2 w-12 text-right">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
