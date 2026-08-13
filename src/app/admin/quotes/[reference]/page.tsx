import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote, quoteRevisions } from "@/lib/db/quotes";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/db/types";
import { emailQuote, makeInvoiceFromQuote, reserveQuote, reviseQuote, saveQuoteCommercial, setQuoteStatus } from "../../actions";

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
  const q = await getQuote(decodeURIComponent(reference));
  if (!q) notFound();
  const revisions = await quoteRevisions(q.reference);

  const findings = q.findings as Finding[];
  const blocking = findings.filter((f) => f.severity === "error");
  const taxable = Math.max(0, Number(q.subtotal_pkr || 0) - Number(q.discount_pkr || 0));
  const total = taxable + taxable * (Number(q.tax_rate || 0) / 100);

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
          <div className="grid gap-2 mt-4 pt-4 border-t border-[var(--line)]">
            <a href={`/api/admin/quotes/${q.reference}/pdf`} className="btn btn-sm">Download quote PDF</a>
            <form action={emailQuote}><input type="hidden" name="reference" value={q.reference}/><button className="btn btn-sm w-full">Email PDF to customer</button></form>
            {q.phone && <a className="btn btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/${q.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Your quotation ${q.reference}: ${process.env.APP_URL ?? "http://localhost:3000"}/api/admin/quotes/${q.reference}/pdf`)}`}>Share on WhatsApp</a>}
            <form action={reserveQuote}><input type="hidden" name="reference" value={q.reference}/><button className="btn btn-sm w-full" disabled={!q.lines.length}>Reserve stock</button></form>
            <form action={makeInvoiceFromQuote}>
              <input type="hidden" name="reference" value={q.reference} />
              <button className="btn btn-primary btn-sm w-full" disabled={!q.lines.length}>Create invoice</button>
            </form>
          </div>
          <form action={reviseQuote} className="grid gap-2 mt-4 pt-4 border-t border-[var(--line)]"><input type="hidden" name="reference" value={q.reference}/><input name="revision_note" className="field" placeholder="Reason for revision"/><button className="btn btn-sm">Create revision {q.revision_number+1}</button></form>
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
            <Row label="Sent" value={q.sent_at ? new Date(q.sent_at).toLocaleString("en-GB") : "Not sent"} />
            <Row label="Opened" value={q.opened_at ? new Date(q.opened_at).toLocaleString("en-GB") : "Not recorded"} />
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
          {revisions.length>0&&<section className="panel p-4 sm:p-5"><h2 className="t-label mb-3">Revision history</h2>{revisions.map(r=><div key={r.revision_number} className="py-2 border-b border-[var(--line)] text-[12px]"><strong>Revision {r.revision_number}</strong> · {new Date(r.created_at).toLocaleString("en-GB")} · {r.actor_email}<span className="block text-ink-2">{r.note}</span></div>)}</section>}

          <form action={saveQuoteCommercial} className="admin-panel">
            <input type="hidden" name="reference" value={q.reference} />
            <div className="flex items-end justify-between gap-4">
              <div><p className="admin-kicker">Commercial terms</p><h2>Price this quotation</h2></div>
              <strong className="t-data text-acc">PKR {Math.round(total).toLocaleString("en-US")}</strong>
            </div>
            <div className="grid gap-2 mt-4">
              {q.lines.map((line, index) => (
                <div key={`${line.sku}-${index}`} className="admin-line-item">
                  <span><strong>{line.brand} {line.model}</strong><small>{line.sku} · Qty {line.qty}</small></span>
                  <label><span>Unit price PKR</span><input name={`line_price_${index}`} type="number" min="0" step="1" defaultValue={Number(line.unit_price_pkr || 0)} className="field text-right" /></label>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label><span>Tax rate %</span><input name="tax_rate" type="number" min="0" step="0.01" defaultValue={Number(q.tax_rate || 0)} className="field" /></label>
              <label><span>Discount PKR</span><input name="discount_pkr" type="number" min="0" step="1" defaultValue={Number(q.discount_pkr || 0)} className="field" /></label>
              <label><span>Valid until</span><input name="valid_until" type="date" defaultValue={q.valid_until ? String(q.valid_until).slice(0, 10) : ""} className="field" /></label>
              <label><span>Payment terms</span><input name="payment_terms" defaultValue={q.payment_terms ?? "50% advance, balance before dispatch"} className="field" /></label>
            </div>
            <button className="btn btn-primary mt-4">Save and mark quoted</button>
          </form>

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
