"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import QuoteDocument, { type QuoteMeta } from "./QuoteDocument";
import { BRAND } from "@/lib/brand";
import { submitQuote } from "./actions";
import { CONDITION_LABEL, KIND_LABEL, type Product } from "@supercomputers/shared";
import { checkBuild } from "@supercomputers/shared";
import { TARGET_LABEL, type Target } from "@supercomputers/shared";
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
  /** The reference the server gave back, which is proof it was stored. */
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  /**
   * The reference, generated after mount rather than during render.
   *
   * It was a useState initialiser, which runs on the server during the
   * pre-render and then again in the browser. Both halves called Math.random
   * and Date, so they produced different strings and React reported a
   * hydration mismatch on every load of this page. It is only meaningful once
   * somebody sends or prints, so a placeholder until then costs nothing.
   */
  const [ref_, setRef] = useState<string | null>(null);
  useEffect(() => setRef(makeRef()), []);
  const reference = sent ?? ref_ ?? "pending";

  const report = useMemo(() => checkBuild({ lines, target }), [lines, target]);
  const set = <K extends keyof QuoteMeta>(k: K, v: QuoteMeta[K]) => setMeta((m) => ({ ...m, [k]: v }));

  const toggleWorkload = (w: string) =>
    setMeta((m) => ({
      ...m,
      workloads: m.workloads.includes(w) ? m.workloads.filter((x) => x !== w) : [...m.workloads, w],
    }));

  /**
   * What has to be true before this can leave the browser.
   *
   * The printed document is addressed to someone and quoted against a
   * configuration, so producing one with neither is not a smaller version of
   * the document, it is a blank with our letterhead on it. The same three
   * checks therefore guard the PDF and the send, rather than only the send.
   */
  type FieldErrors = Partial<Record<"name" | "email" | "lines", string>>;

  const problems = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    if (!meta.name.trim()) e.name = "Please give us a name to address the quotation to.";
    else if (meta.name.trim().length < 2) e.name = "That looks too short to be a name.";

    if (!meta.email.trim()) e.email = "Please give us an email address to send the quotation to.";
    // Deliberately loose. The only address that really validates is one that
    // receives, and a strict pattern turns away more real addresses than fake.
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(meta.email.trim())) {
      e.email = "That does not look like an email address.";
    }

    if (lines.length === 0) {
      e.lines = "There is nothing to quote yet. Put a configuration together first.";
    }
    return e;
  }, [meta.name, meta.email, lines.length]);

  const complete = Object.keys(problems).length === 0;

  /** Errors stay hidden until something is actually attempted. */
  const [shown, setShown] = useState(false);
  const errors: FieldErrors = shown ? problems : {};

  /**
   * Refuses, and says which field and why, rather than leaving a dead button.
   *
   * Returns whether it is safe to continue, and puts the cursor in the first
   * field at fault so the fix is one keystroke away on a phone.
   */
  const guard = useCallback((): boolean => {
    if (complete) return true;
    setShown(true);
    const first = problems.name ? "name" : problems.email ? "email" : null;
    if (first) {
      const el = document.querySelector<HTMLInputElement>(`#quote-${first}`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return false;
  }, [complete, problems]);

  const print = useCallback(() => {
    if (!guard()) return;
    // The browser's own print dialog offers "Save as PDF" on every platform,
    // which beats shipping a PDF library for a document this simple.
    window.print();
  }, [guard]);

  /**
   * Sends the request to the API, which stores it.
   *
   * This used to compose a mailto: draft, from before there was anywhere to put
   * a request. That meant the quotes table stayed empty, the administrator's
   * request queue was permanently blank, and a customer's account page promised
   * a history it could never show. It posts now.
   *
   * Only the SKU and quantity of each line travel. The server re-resolves them
   * against the catalogue and re-runs the compatibility engine, so the summary
   * recorded against the request is its own, not the browser's.
   */
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guard()) return;

    const form = new FormData();
    form.set("contact_name", meta.name);
    form.set("contact_email", meta.email);
    form.set("organisation", meta.org);
    form.set("phone", meta.phone);
    form.set("city", meta.city);
    form.set("timeline", meta.timeline);
    form.set("target", target);
    form.set("workloads", meta.workloads.join("\n"));
    form.set("notes", meta.notes);
    form.set("lines", JSON.stringify(lines.map((l) => ({ sku: l.product.id, qty: l.qty }))));

    startSending(async () => {
      const result = await submitQuote(undefined, form);
      if (result?.ok) {
        setSent(result.reference);
        setSendError(null);
      } else {
        setSendError(result?.error ?? "Could not send the request.");
      }
    });
  }

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_21rem] gap-8 items-start no-print">
        {/* ------------------------------------------------------------ form */}
        <form onSubmit={submit} className="space-y-7 min-w-0">
          <fieldset className="space-y-3">
            <legend className="t-label mb-2.5">Your details</legend>
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
                    id={`quote-${key}`}
                    name={key}
                    value={meta[key] as string}
                    onChange={(e) => set(key, e.target.value as QuoteMeta[typeof key])}
                    required={req}
                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                    autoComplete={ac}
                    aria-invalid={key in errors || undefined}
                    aria-describedby={key in errors ? `quote-${key}-error` : undefined}
                    className={`field ${
                      key in errors ? "border-[color-mix(in_srgb,var(--color-err)_60%,transparent)]" : ""
                    }`}
                    placeholder={key === "phone" ? "+92" : undefined}
                  />
                  {key in errors && (
                    <span id={`quote-${key}-error`} role="alert" className="block text-[11.5px] text-err mt-1.5">
                      {errors[key as "name" | "email"]}
                    </span>
                  )}
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
            <legend className="t-label mb-2.5">Intended workload</legend>
            <p className="text-[12.5px] text-ink-2 mb-3 leading-relaxed">
              This matters more than anything else on the form. It decides whether your budget belongs in memory,
              in graphics cards, in processor cores, or in the network between the machines.
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
                Anything else we should know
              </span>
              <textarea
                value={meta.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={6}
                className="field h-auto py-2.5 resize-y leading-relaxed"
                placeholder="Model and dataset sizes, any hardware this has to work alongside, the space and power available, whether there is a generator, how the room is cooled, and whether anyone on site can install it."
              />
            </label>
          </fieldset>

          {/*
            Both buttons stay enabled on purpose. A disabled control tells you
            nothing about what is wrong with it, and on a phone you cannot even
            hover it to find out. These accept the click and then explain.
          */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" className="btn btn-primary" disabled={sending || sent !== null}>
              {sending ? "Sending" : sent ? "Sent" : "Send request"}
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

          {errors.lines && (
            <p role="alert" className="text-[12.5px] text-err leading-relaxed">
              {errors.lines}{" "}
              <Link href="/configure" className="underline hover:text-ink">
                Open the configurator
              </Link>
              .
            </p>
          )}
          {!complete && !shown && (
            <p className="text-[11.5px] text-ink-3">
              Name and email are needed before a quotation can be sent or printed.
            </p>
          )}
          {sendError && (
            <p role="alert" className="text-[12.5px] text-err leading-relaxed">
              {sendError}
            </p>
          )}
          {sent && (
            <div className="panel p-4 border-[color-mix(in_srgb,var(--color-ok)_36%,var(--line))]">
              <p className="text-[13.5px]">
                Sent. Your reference is <strong className="t-data text-ink">{sent}</strong>, and we reply within
                one working day.
              </p>
              <p className="text-[12.5px] text-ink-2 mt-1.5 leading-relaxed">
                Quote it if you call. Download the PDF below if you want a copy for your own records.
              </p>
            </div>
          )}
        </form>

        {/* ------------------------------------------------------------ rail */}
        <aside className="space-y-4">
          <div className="panel-raised ticked">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">Requirement</span>
              <span className="t-data text-[10px] text-ink-3">{reference}</span>
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
                    <span className="t-data">{report.summary.power.peakW.toLocaleString("en-GB")} W</span>
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
                  "We confirm what is held in stock and what has to be brought in.",
                  "You receive an itemised quotation, landed, with duty and taxes included.",
                  "We set out anything we would change about the configuration, and why.",
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
            <h2 className="t-label mb-2.5">Or speak to us directly</h2>
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
                ref_={reference}
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
          ref_={reference}
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
