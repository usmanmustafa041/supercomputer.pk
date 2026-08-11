"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import QuoteDocument, { type QuoteMeta } from "./QuoteDocument";
import { BRAND } from "@/lib/brand";
import { CONDITION_LABEL, KIND_LABEL, type Product } from "@/lib/catalog";
import { checkBuild } from "@/lib/compat/engine";
import { TARGET_LABEL, type Target } from "@/lib/compat/types";
import "./print.css";

const WORKLOADS = [
  "LLM training or fine-tuning",
  "LLM inference / serving",
  "Computer vision",
  "CFD or FEA simulation",
  "Rendering / VFX",
  "Virtual desktops (VDI)",
  "Bioinformatics / genomics",
  "General virtualisation",
  "Storage / data lake",
  "Not sure yet",
];

const TIMELINES = ["Immediately", "Within a month", "This quarter", "Budgeting for next year"];

/** Short, human-readable reference so a request can be quoted over the phone. */
function makeRef(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SC-${stamp}-${rand}`;
}

export default function QuoteForm({
  lines,
  target,
}: {
  lines: Array<{ product: Product; qty: number }>;
  target: Target;
}) {
  const [meta, setMeta] = useState<QuoteMeta>({
    name: "",
    org: "",
    email: "",
    phone: "",
    city: "",
    timeline: TIMELINES[1],
    workloads: [],
    notes: "",
  });
  const [sent, setSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Generated once per mount so the on-screen reference matches the printed one.
  const [ref_] = useState(makeRef);

  const report = useMemo(() => checkBuild({ lines, target }), [lines, target]);
  const set = <K extends keyof QuoteMeta>(k: K, v: QuoteMeta[K]) => setMeta((m) => ({ ...m, [k]: v }));

  const toggleWorkload = (w: string) =>
    setMeta((m) => ({
      ...m,
      workloads: m.workloads.includes(w) ? m.workloads.filter((x) => x !== w) : [...m.workloads, w],
    }));

  const complete = meta.name.trim() !== "" && meta.email.trim() !== "";

  const print = useCallback(() => {
    // The browser's own print dialog offers "Save as PDF" on every platform,
    // which beats shipping a PDF library for a document this simple.
    window.print();
  }, []);

  /**
   * No backend yet — this composes a mail draft carrying the whole request so
   * nothing is silently dropped while the email-versus-database decision is
   * still open. Swap for a POST when that is settled.
   */
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = [
      `Requirement reference: ${ref_}`,
      "",
      `Name: ${meta.name}`,
      `Organisation: ${meta.org || "not stated"}`,
      `Email: ${meta.email}`,
      `Phone: ${meta.phone || "not stated"}`,
      `City: ${meta.city || "not stated"}`,
      `Timeline: ${meta.timeline}`,
      `Deployment: ${TARGET_LABEL[target]}`,
      "",
      `Workload: ${meta.workloads.join(", ") || "not stated"}`,
      "",
      `Configuration (${lines.length} lines):`,
      ...lines.map(
        (l) => `  ${l.qty}x  ${l.product.brand} ${l.product.model} [${CONDITION_LABEL[l.product.condition]}] ${l.product.id}`
      ),
      "",
      `Peak draw: ${report.summary.power.peakW} W (${report.summary.power.amps230} A at 230V)`,
      `Rack space: ${report.summary.rackU ? `${report.summary.rackU}U` : "tower"}`,
      `Compatibility: ${report.errors} blocking, ${report.warns} warnings`,
      "",
      "Requirements:",
      meta.notes || "—",
      "",
      "(Printed requirement document attached separately.)",
    ].join("\n");

    window.location.href = `mailto:${BRAND.email}?subject=${encodeURIComponent(
      `Quote request ${ref_} — ${meta.org || meta.name}`
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_21rem] gap-8 items-start no-print">
        {/* ------------------------------------------------------------ form */}
        <form onSubmit={submit} className="space-y-7 min-w-0">
          <fieldset className="space-y-3">
            <legend className="t-label mb-2.5">Who you are</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["name", "Name", "name", true],
                ["org", "Organisation", "organization", false],
                ["email", "Email", "email", true],
                ["phone", "Phone", "tel", false],
                ["city", "City", "address-level2", false],
              ] as Array<[keyof QuoteMeta, string, string, boolean]>).map(([key, label, ac, req]) => (
                <label key={key} className="block">
                  <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">
                    {label}
                    {req && <span className="text-acc ml-1">*</span>}
                  </span>
                  <input
                    value={meta[key] as string}
                    onChange={(e) => set(key, e.target.value as QuoteMeta[typeof key])}
                    required={req}
                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                    autoComplete={ac}
                    className="field"
                    placeholder={key === "phone" ? "+92" : undefined}
                  />
                </label>
              ))}
              <label className="block">
                <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">
                  Timeline
                </span>
                <select
                  value={meta.timeline}
                  onChange={(e) => set("timeline", e.target.value)}
                  className="field"
                >
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="t-label mb-2.5">What it is for</legend>
            <p className="text-[12.5px] text-ink-2 mb-3 leading-relaxed">
              This is what actually drives the specification — whether you want memory bandwidth, VRAM
              capacity, core count or fabric.
            </p>
            <div className="flex flex-wrap gap-2">
              {WORKLOADS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWorkload(w)}
                  aria-pressed={meta.workloads.includes(w)}
                  className={`btn btn-sm ${meta.workloads.includes(w) ? "btn-primary" : "btn-ghost"}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="t-label mb-2.5">Detail</legend>
            <label className="block">
              <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">
                Requirements and site constraints
              </span>
              <textarea
                value={meta.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={6}
                className="field h-auto py-2.5 resize-y leading-relaxed"
                placeholder="Model sizes, dataset volume, existing hardware to integrate with, rack depth and power available, whether there is a generator, cooling in the room, anyone on site who can rack it."
              />
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" className="btn btn-primary" disabled={!complete}>
              Send request
            </button>
            <button type="button" onClick={print} className="btn btn-ghost">
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="btn btn-ghost btn-sm"
              aria-expanded={showPreview}
            >
              {showPreview ? "Hide" : "Preview"} document
            </button>
          </div>

          {!complete && (
            <p className="text-[11.5px] text-ink-3">Name and email are needed before the request can be sent.</p>
          )}
          {sent && <p className="pill pill-ok">Draft opened — send it and we reply within one working day</p>}
        </form>

        {/* ------------------------------------------------------------ rail */}
        <aside className="space-y-4">
          <div className="panel-raised ticked">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">Requirement</span>
              <span className="t-data text-[10px] text-ink-3">{ref_}</span>
            </div>

            <div className="p-4 space-y-2.5 border-b border-[var(--line)]">
              <div className="flex justify-between gap-3 text-[12.5px]">
                <span className="text-ink-2">Deployment</span>
                <span>{TARGET_LABEL[target]}</span>
              </div>
              <div className="flex justify-between gap-3 text-[12.5px]">
                <span className="text-ink-2">Lines</span>
                <span className="t-data">{lines.length}</span>
              </div>
              {report.summary.power.peakW > 0 && (
                <>
                  <div className="flex justify-between gap-3 text-[12.5px]">
                    <span className="text-ink-2">Peak draw</span>
                    <span className="t-data">{report.summary.power.peakW.toLocaleString()} W</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[12.5px]">
                    <span className="text-ink-2">Rack space</span>
                    <span className="t-data">{report.summary.rackU ? `${report.summary.rackU}U` : "tower"}</span>
                  </div>
                </>
              )}
              {lines.length > 0 && (
                <div className="flex justify-between gap-3 text-[12.5px] pt-2 border-t border-[var(--line)]">
                  <span className="text-ink-2">Compatibility</span>
                  <span className={`pill ${report.errors ? "pill-err" : "pill-ok"}`}>
                    {report.errors ? `${report.errors} blocking` : "clean"}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h2 className="t-label mb-2.5">What happens next</h2>
              <ol className="space-y-2 text-[12.5px] text-ink-1 leading-relaxed">
                {[
                  "We confirm availability against our own stock and import channel.",
                  "You get a landed quotation — duty and taxes included, itemised.",
                  "Anything we would change in the configuration, with the reason.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="t-data text-[10px] text-acc shrink-0 mt-0.5">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="t-label mb-2.5">Or talk to someone</h2>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Email</dt>
                <dd>
                  <a href={`mailto:${BRAND.email}`} className="text-ink-1 hover:text-acc transition-colors">
                    {BRAND.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Phone</dt>
                <dd className="text-ink-1">{BRAND.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Hours</dt>
                <dd className="text-ink-1">{BRAND.hours}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {/* ---------------------------------------------------- on-screen preview */}
      {showPreview && (
        <section className="mt-8 no-print">
          <h2 className="t-label mb-3">Document preview</h2>
          <div className="panel p-4 overflow-x-auto bg-[var(--color-base)]">
            <div className="quote-preview" style={{ width: "210mm", maxWidth: "100%" }}>
              <QuoteDocument
                ref_={ref_}
                meta={meta}
                lines={lines}
                summary={report.summary}
                findings={report.findings}
                target={target}
              />
            </div>
          </div>
        </section>
      )}

      {/* The copy that actually prints. Hidden on screen by print.css. */}
      <div id="quote-print-root">
        <QuoteDocument
          ref_={ref_}
          meta={meta}
          lines={lines}
          summary={report.summary}
          findings={report.findings}
          target={target}
        />
      </div>
    </>
  );
}

/** Line list shown above the form, so the configuration is visible immediately. */
export function QuoteLines({ lines }: { lines: Array<{ product: Product; qty: number }> }) {
  if (!lines.length) return null;
  return (
    <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
      {lines.map(({ product, qty }) => (
        <div key={product.id} className="bg-[var(--color-surface)] flex items-center gap-3 px-4 py-2.5">
          <span className="t-data text-[11px] text-ink-3 w-8 shrink-0">{qty}x</span>
          <span className="t-data text-[10px] text-ink-3 w-28 shrink-0 hidden sm:inline truncate">
            {KIND_LABEL[product.kind]}
          </span>
          <Link
            href={`/product/${product.slug}`}
            className="text-[12.5px] flex-1 min-w-0 truncate hover:text-acc transition-colors"
          >
            <span className="text-ink-2">{product.brand}</span> {product.model}
          </Link>
          <span className={`pill shrink-0 hidden md:inline-flex ${product.condition !== "new" ? "pill-acc" : ""}`}>
            {CONDITION_LABEL[product.condition]}
          </span>
        </div>
      ))}
    </div>
  );
}
