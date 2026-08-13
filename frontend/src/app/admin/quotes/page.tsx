import Link from "next/link";
import { quotes as quotesApi } from "@/lib/api/resources";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/api/types";

export const metadata = { title: "Requests" };

const STATUSES = Object.entries(QUOTE_STATUS_LABEL) as [QuoteStatus, string][];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await quotesApi.list({ status: sp.status, page, perPage: 25 });

  return (
    <div className="shell py-6 sm:py-8">
      <h1 className="t-display text-xl sm:text-2xl mb-1">Quote requests</h1>
      <p className="text-[13px] text-ink-2 mb-4">{data.total} in total</p>

      {/* Scrolls sideways on a phone rather than wrapping into three rows. */}
      <div className="flex gap-1.5 mb-4 -mx-1 px-1 overflow-x-auto no-bar">
        <Link href="/admin/quotes" className={`pill shrink-0 ${!sp.status ? "pill-cool" : ""}`}>
          All
        </Link>
        {STATUSES.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/quotes?status=${k}`}
            className={`pill shrink-0 ${sp.status === k ? "pill-cool" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {data.items.length === 0 ? (
        <p className="panel p-8 text-center text-[14px] text-ink-2">Nothing here.</p>
      ) : (
        <ul className="grid gap-2">
          {data.items.map((q) => (
            <li key={q.id}>
              <Link
                href={`/admin/quotes/${q.reference}`}
                className="panel p-4 grid sm:grid-cols-[10rem_1fr_auto] gap-x-4 gap-y-1 sm:items-center hover:border-[var(--line-mid)] transition-colors"
              >
                <span className="t-data text-[12px]">{q.reference}</span>
                <span className="min-w-0">
                  <span className="block text-[14px] truncate">
                    {q.contact_name}
                    {q.organisation ? ` · ${q.organisation}` : ""}
                  </span>
                  <span className="block text-[12px] text-ink-3 truncate">
                    {q.lines.length} {q.lines.length === 1 ? "item" : "items"} ·{" "}
                    {new Date(q.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span
                  className={`pill justify-self-start sm:justify-self-end ${
                    q.status === "new" ? "pill-cool" : ""
                  }`}
                >
                  {QUOTE_STATUS_LABEL[q.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
