import Link from "next/link";
import { countsByKind } from "@/lib/db/products";
import { listQuotes, stats } from "@/lib/db/quotes";
import { QUOTE_STATUS_LABEL } from "@/lib/db/types";
import { KIND_LABEL } from "@/lib/catalog/types";

export const metadata = { title: "Overview" };

function Figure({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-mark" />
      <div className="t-display text-2xl sm:text-3xl tabular-nums">{n.toLocaleString("en-GB")}</div>
      <div className="text-[11px] uppercase tracking-[0.12em] mt-2 leading-snug text-ink-1">{label}</div>
      {sub && <div className="text-[12px] text-ink-3 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function AdminHome() {
  const [s, kinds, recent] = await Promise.all([
    stats(),
    countsByKind(),
    listQuotes({ perPage: 6 }),
  ]);

  const top = Object.entries(kinds).slice(0, 12);
  const busiest = top[0]?.[1] ?? 1;

  return (
    <div className="shell admin-screen py-6 sm:py-8">
      <div className="admin-heading">
        <div><p className="admin-kicker">Command centre / live operations</p><h1>Dashboard</h1></div>
        <div className="admin-live"><i /> Systems operational</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <Figure
          n={s.productsActive}
          label="Products listed"
          sub={`${s.productsTotal.toLocaleString("en-GB")} including retired`}
        />
        <Figure n={s.productsInStock} label="In stock now" />
        <Figure
          n={s.quotesNew}
          label="New requests"
          sub={`${s.quotesTotal.toLocaleString("en-GB")} all time`}
        />
        <Figure n={s.usersTotal} label="Accounts" />
        <Figure n={s.invoicesOutstanding} label="Open invoices" sub={`${s.invoicesTotal} generated`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-label">Latest requests</h2>
            <Link href="/admin/quotes" className="text-[13px] text-acc hover:underline">
              See all
            </Link>
          </div>
          {recent.items.length === 0 ? (
            <p className="panel p-5 text-[14px] text-ink-2">No requests yet.</p>
          ) : (
            <ul className="grid gap-2">
              {recent.items.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/admin/quotes/${q.reference}`}
                    className="panel p-3.5 flex items-center gap-3 hover:border-[var(--line-mid)] transition-colors"
                  >
                    <span className="t-data text-[12px] shrink-0">{q.reference}</span>
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
            {top.map(([kind, n]) => (
              <Link
                key={kind}
                href={`/admin/products?kind=${kind}`}
                className="flex items-center gap-3 text-[13px] py-0.5 hover:text-acc transition-colors"
              >
                <span className="w-24 sm:w-28 shrink-0 truncate">
                  {KIND_LABEL[kind as keyof typeof KIND_LABEL] ?? kind}
                </span>
                <span className="flex-1 h-1 bg-[var(--line)] min-w-0">
                  <span className="block h-full bg-acc" style={{ width: `${(n / busiest) * 100}%` }} />
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
