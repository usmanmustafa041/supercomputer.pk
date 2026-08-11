import Link from "next/link";
import type { Metadata } from "next";
import { CONDITION_LABEL, CONDITION_NOTE, allProducts, type Condition } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Condition grading",
  description: "What each condition grade means, what testing it has had, and what warranty it carries.",
};

const DETAIL: Record<Condition, { test: string; warranty: string; buy: string; avoid: string }> = {
  new: {
    test: "Factory sealed. Opened only if the customer asks for a pre-dispatch function check.",
    warranty: "Manufacturer warranty where the vendor honours it in Pakistan, ours where they do not.",
    buy: "Production systems, anything under a support contract, anything you cannot take offline.",
    avoid: "Lab and development work where the price difference buys you a second machine.",
  },
  "open-box": {
    test: "Customer return, unused. Full function test and cosmetic inspection on receipt.",
    warranty: "12 months from us.",
    buy: "Anywhere you would buy new. The discount is for the opened carton, nothing else.",
    avoid: "Nothing in particular — this is the easiest grade to recommend.",
  },
  recertified: {
    test: "Returned to the manufacturer, re-certified by them, original serial and service tag intact.",
    warranty: "12 months from us, and the service tag usually still resolves with the OEM.",
    buy: "Enterprise gear where you want the OEM's firmware and support path preserved.",
    avoid: "Cases where you need the original purchase date for a support contract.",
  },
  "refurb-a": {
    test: "Bench tested under sustained synthetic load for 48 hours. Re-pasted, fans and pads replaced where worn. Cosmetically near-new.",
    warranty: "12 months from us.",
    buy: "The default choice for most builds. Same behaviour as new, meaningfully cheaper.",
    avoid: "Situations where a visible non-original serial would fail an audit.",
  },
  "refurb-b": {
    test: "Same 48-hour load test as Grade A. Visible cosmetic wear — scuffs, rack rash, faded print. No functional impact.",
    warranty: "6 months from us.",
    buy: "Anything that lives inside a rack where nobody sees it. Compute nodes, spares, lab kit.",
    avoid: "Front-of-house workstations, or anywhere appearance forms part of the handover.",
  },
  pull: {
    test: "Pulled working from a decommissioned system, cleaned, re-pasted and load tested. SMART and error counters recorded and supplied.",
    warranty: "3 months from us.",
    buy: "Spares, scale-out compute nodes where a failure just re-queues the job, and experimental builds.",
    avoid: "Head nodes, storage, fabric — anywhere a single failure takes the whole cluster with it.",
  },
};

const ORDER: Condition[] = ["new", "open-box", "recertified", "refurb-a", "refurb-b", "pull"];

export default function GradingPage() {
  const all = allProducts();
  const counts = new Map<Condition, number>();
  for (const p of all) counts.set(p.condition, (counts.get(p.condition) ?? 0) + 1);

  return (
    <div className="shell py-9 md:py-12">
      <header className="max-w-3xl mb-10">
        <p className="t-eyebrow mb-2.5">Reference</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">Condition grading</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          &ldquo;Refurbished&rdquo; is a word that means whatever the seller wants it to. Here it means one of six
          specific things, each with a defined test regime and warranty term. The grade appears on the listing, on
          the quote and on the invoice, and it is what determines the price — not a vague sense of how used
          something looks.
        </p>
      </header>

      <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
        {ORDER.map((c) => {
          const d = DETAIL[c];
          const n = counts.get(c) ?? 0;
          return (
            <section key={c} className="bg-[var(--color-surface)] p-5 md:p-7 grid lg:grid-cols-[16rem_1fr] gap-5 lg:gap-8">
              <div>
                <h2 className="t-data text-[13px] uppercase tracking-[0.1em] text-acc">{CONDITION_LABEL[c]}</h2>
                <p className="text-[12.5px] text-ink-1 mt-2.5 leading-relaxed">{CONDITION_NOTE[c]}</p>
                <Link
                  href={`/catalog?condition=${c}`}
                  className="btn btn-ghost btn-sm mt-4"
                >
                  {n.toLocaleString()} SKUs
                </Link>
              </div>

              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {([
                  ["Testing", d.test],
                  ["Warranty", d.warranty],
                  ["Right for", d.buy],
                  ["Wrong for", d.avoid],
                ] as Array<[string, string]>).map(([k, v]) => (
                  <div key={k}>
                    <dt className="t-data text-[10px] text-ink-3 uppercase tracking-wider mb-1.5">{k}</dt>
                    <dd className="text-[13px] text-ink-1 leading-relaxed">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      <section className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="panel p-6">
          <h2 className="t-display text-[20px]">On used drives specifically</h2>
          <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed">
            Every used SSD ships with its SMART output attached to the invoice: power-on hours, total bytes
            written and remaining endurance as a percentage. A drive with 3 DWPD of rated endurance that has used
            4% of it is a genuinely good buy; one that has used 80% is not, whatever the cosmetic grade says. We
            will not sell you the second one without telling you first.
          </p>
        </div>
        <div className="panel p-6">
          <h2 className="t-display text-[20px]">On used GPUs specifically</h2>
          <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed">
            Cards from the mining era are common here and not automatically bad — a card run at a steady
            undervolted load often had an easier life than one that spent three years thermal-cycling in a
            gaming machine. What matters is fans, thermal pads and the state of the power connector. All three
            are inspected and replaced where needed, and 12VHPWR connectors are checked for the discolouration
            that precedes a failure.
          </p>
        </div>
      </section>
    </div>
  );
}
