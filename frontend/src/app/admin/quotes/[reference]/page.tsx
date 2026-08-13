import Link from "next/link";
import { notFound } from "next/navigation";
import { quotes as quotesApi } from "@/lib/api/resources";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/api/types";
import { setQuoteStatus } from "../../actions";

export const metadata = { title: "Request" };

const STATUSES = Object.entries(QUOTE_STATUS_LABEL) as [QuoteStatus, string][];

type Finding = { severity?: string; title?: string; detail?: string; message?: string };

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[7.5rem_1fr] gap-3 py-1.5 border-b border-[var(--line)] last:border-0">
      <span className="text-[12px] text-ink-3">{label}</span>
      <span className="text-[13px] break-words">{value}</span>
    </div>
  );
}

export default async function QuoteDetail({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const q = await quotesApi.byReference(decodeURIComponent(reference));
  if (!q) notFound();

  const findings = q.findings as Finding[];
  const blocking = findings.filter((f) => f.severity === "error");

  return (
    <div className="shell py-6 sm:py-8 max-w-5xl">
      <Link href="/admin/quotes" className="text-[13px] text-ink-2 hover:text-ink">
        Back to requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-5">
        <div>
          <h1 className="t-display text-xl sm:text-2xl">{q.reference}</h1>
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

      <div className="grid lg:grid-cols-[1fr_20rem] gap-5 items-start">
        {/* Status first on a phone: it is the thing you came to change. */}
        <aside className="panel p-4 sm:p-5 order-first lg:order-last lg:sticky lg:top-20 w-full">
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
                rows={5}
                defaultValue={q.internal_note ?? ""}
                placeholder="Only your team sees this."
                className="field h-auto py-2 leading-relaxed"
              />
            </label>
            <button className="btn btn-primary btn-sm">Save</button>
          </form>
        </aside>

        <div className="grid gap-5 min-w-0">
          <section className="panel p-4 sm:p-5">
            <h2 className="t-label mb-3">Who asked</h2>
            <Row label="Name" value={q.contact_name} />
            <Row label="Email" value={q.contact_email} />
            <Row label="Company" value={q.organisation} />
            <Row label="Phone" value={q.phone} />
            <Row label="City" value={q.city} />
            <Row label="Needed by" value={q.timeline} />
            <Row label="Setup" value={q.target} />
            <Row label="Workload" value={q.workloads.join(", ") || null} />
            <Row label="Notes" value={q.notes} />
            <div className="flex flex-wrap gap-2 mt-4">
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

          <section className="panel p-4 sm:p-5">
            <h2 className="t-label mb-3">What they configured</h2>
            {q.lines.length === 0 ? (
              <p className="text-[13px] text-ink-2">No parts were attached.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {q.lines.map((l, i) => (
                  <li key={`${l.sku}-${i}`} className="flex items-baseline gap-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1">
                      {l.brand} {l.model}
                      <span className="block t-data text-[11px] text-ink-3">{l.sku}</span>
                    </span>
                    <span className="tabular-nums text-ink-2 shrink-0">x{l.qty ?? 1}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {findings.length > 0 && (
            <section className="panel p-4 sm:p-5">
              <h2 className="t-label mb-1">What the checker said</h2>
              <p className="text-[12px] text-ink-3 mb-3 leading-relaxed">
                {blocking.length > 0
                  ? `${blocking.length} of these would stop the build working. Worth raising before you price it.`
                  : "Nothing here blocks the build."}
              </p>
              <ul className="grid gap-2">
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
      </div>
    </div>
  );
}
