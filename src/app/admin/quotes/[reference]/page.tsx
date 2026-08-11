import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api/server";
import { QUOTE_STATUS_LABEL, type Quote, type QuoteStatus } from "@/lib/api/types";
import { setQuoteStatus } from "../../actions";

export const metadata = { title: "Request" };

const STATUSES = Object.entries(QUOTE_STATUS_LABEL) as [QuoteStatus, string][];

type Line = { sku?: string; qty?: number; brand?: string; model?: string; kind?: string };
type Finding = { severity?: string; title?: string; detail?: string; message?: string };

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5 border-b border-[var(--line)] last:border-0">
      <span className="text-[12px] text-ink-3">{label}</span>
      <span className="text-[13px] break-words">{value}</span>
    </div>
  );
}

export default async function QuoteDetail({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  let q: Quote;
  try {
    q = await api<Quote>(`/api/admin/quotes/${encodeURIComponent(reference)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const lines = q.lines as Line[];
  const findings = q.findings as Finding[];
  const blocking = findings.filter((f) => f.severity === "error");

  return (
    <div className="shell py-8 max-w-5xl">
      <Link href="/admin/quotes" className="text-[13px] text-ink-2 hover:text-ink">
        Back to requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-6">
        <div>
          <h1 className="t-display text-2xl">{q.reference}</h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Sent{" "}
            {new Date(q.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`pill ${q.status === "new" ? "pill-cool" : ""}`}>{QUOTE_STATUS_LABEL[q.status]}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
        <div className="grid gap-6">
          <section className="panel p-5">
            <h2 className="t-label mb-3">Who asked</h2>
            <Row label="Name" value={q.contact_name} />
            <Row label="Email" value={q.contact_email} />
            <Row label="Company" value={q.organisation} />
            <Row label="Phone" value={q.phone} />
            <Row label="City" value={q.city} />
            <Row label="Needed by" value={q.timeline} />
            <Row label="Setup" value={q.target} />
            <Row label="Workload" value={(q.workloads as string[]).join(", ") || null} />
            <Row label="Notes" value={q.notes} />
            <div className="flex gap-2 mt-4">
              <a href={`mailto:${q.contact_email}?subject=Your quote ${q.reference}`} className="btn btn-sm">
                Reply by email
              </a>
              {q.phone && (
                <a href={`tel:${q.phone.replace(/\s/g, "")}`} className="btn btn-sm">
                  Call
                </a>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="t-label mb-3">What they configured</h2>
            {lines.length === 0 ? (
              <p className="text-[13px] text-ink-2">No parts were attached.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-ink-3 border-b border-[var(--line)]">
                    <th className="pb-2 font-medium">Part</th>
                    <th className="pb-2 font-medium w-24">SKU</th>
                    <th className="pb-2 font-medium w-14 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={`${l.sku}-${i}`} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2">
                        {l.brand} {l.model}
                        {l.kind && <span className="text-ink-3 text-[12px]"> · {l.kind}</span>}
                      </td>
                      <td className="py-2 t-data text-[11px] text-ink-3">{l.sku}</td>
                      <td className="py-2 text-right tabular-nums">{l.qty ?? 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {findings.length > 0 && (
            <section className="panel p-5">
              <h2 className="t-label mb-1">What the checker said</h2>
              <p className="text-[12px] text-ink-3 mb-3">
                {blocking.length > 0
                  ? `${blocking.length} of these would stop the build working. Worth raising before you price it.`
                  : "Nothing here blocks the build."}
              </p>
              <ul className="grid gap-1.5">
                {findings.map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px]">
                    <span className={`pill shrink-0 ${f.severity === "error" ? "pill-warn" : ""}`}>
                      {f.severity ?? "note"}
                    </span>
                    <span className="text-ink-1">{f.title ?? f.message ?? f.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="panel p-5 lg:sticky lg:top-20">
          <h2 className="t-label mb-3">Where it stands</h2>
          <form action={setQuoteStatus} className="grid gap-3">
            <input type="hidden" name="reference" value={q.reference} />
            <label className="grid gap-1.5">
              <span className="text-[12px] text-ink-3">Status</span>
              <select name="status" defaultValue={q.status} className="field">
                {STATUSES.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] text-ink-3">Note for the team</span>
              <textarea
                name="internal_note"
                rows={6}
                defaultValue={q.internal_note ?? ""}
                placeholder="Only your team sees this."
                className="field h-auto py-2 leading-relaxed"
              />
            </label>
            <button className="btn btn-primary btn-sm">Save</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
