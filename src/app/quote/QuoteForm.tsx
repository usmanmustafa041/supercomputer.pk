"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

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

export default function QuoteForm({ lineIds }: { lineIds: string[] }) {
  const [workloads, setWorkloads] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const toggle = (w: string) =>
    setWorkloads((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  /**
   * No backend is wired up yet, so rather than silently dropping the enquiry
   * this composes a mail draft with everything filled in. Swap this for a POST
   * to whatever CRM the business actually uses.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = [
      `Name: ${fd.get("name")}`,
      `Organisation: ${fd.get("org")}`,
      `Email: ${fd.get("email")}`,
      `Phone: ${fd.get("phone")}`,
      `City: ${fd.get("city")}`,
      `Timeline: ${fd.get("timeline")}`,
      `Budget: ${fd.get("budget") || "not stated"}`,
      "",
      `Workload: ${workloads.join(", ") || "not stated"}`,
      "",
      "Requirements:",
      String(fd.get("notes") || "—"),
      "",
      lineIds.length ? `Attached configuration (${lineIds.length} lines):` : "No configuration attached.",
      ...lineIds.map((l) => `  ${l}`),
    ].join("\n");

    window.location.href = `mailto:${BRAND.email}?subject=${encodeURIComponent(
      `Quote request — ${fd.get("org") || fd.get("name")}`
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <fieldset className="space-y-3">
        <legend className="t-label mb-2.5">Who you are</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">Name</span>
            <input name="name" required className="field" autoComplete="name" />
          </label>
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">Organisation</span>
            <input name="org" className="field" autoComplete="organization" />
          </label>
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">Email</span>
            <input name="email" type="email" required className="field" autoComplete="email" />
          </label>
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">Phone</span>
            <input name="phone" type="tel" className="field" autoComplete="tel" placeholder="+92" />
          </label>
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">City</span>
            <input name="city" className="field" autoComplete="address-level2" />
          </label>
          <label className="block">
            <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">Timeline</span>
            <select name="timeline" className="field" defaultValue={TIMELINES[1]}>
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
          Pick whatever applies. This is what actually drives the specification — it changes whether you want
          memory bandwidth, VRAM capacity, core count or fabric.
        </p>
        <div className="flex flex-wrap gap-2">
          {WORKLOADS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => toggle(w)}
              aria-pressed={workloads.includes(w)}
              className={`btn btn-sm ${workloads.includes(w) ? "btn-primary" : "btn-ghost"}`}
            >
              {w}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="t-label mb-2.5">Detail</legend>
        <label className="block">
          <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">
            Indicative budget (PKR, optional)
          </span>
          <input name="budget" className="field" placeholder="e.g. 40 lac, or a range" />
          <span className="text-[11.5px] text-ink-3 mt-1.5 block leading-relaxed">
            Stating a budget gets you a better answer faster. We will tell you honestly if it is not enough for
            what you have described.
          </span>
        </label>
        <label className="block">
          <span className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider block mb-1.5">
            Requirements and site constraints
          </span>
          <textarea
            name="notes"
            rows={6}
            className="field h-auto py-2.5 resize-y leading-relaxed"
            placeholder="Model sizes, dataset volume, existing hardware to integrate with, rack depth and power available, whether there is a generator, cooling in the room, anyone on site who can rack it."
          />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="btn btn-primary">
          Send request
        </button>
        <p className="text-[11.5px] text-ink-3 leading-relaxed max-w-sm">
          Opens a pre-filled email in your mail client. Nothing is stored on this site.
        </p>
      </div>

      {sent && (
        <p className="pill pill-ok">Draft opened — send it and we will reply within one working day</p>
      )}
    </form>
  );
}
