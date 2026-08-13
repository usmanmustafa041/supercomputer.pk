import Link from "next/link";
import type { Metadata } from "next";
import { CONDITION_LABEL, CONDITION_NOTE, type Condition } from "@/lib/catalog";
import { publicProducts } from "@/lib/db/catalog";

export const metadata: Metadata = {
  title: "What the condition grades mean",
  description: "What each grade means, what testing it went through, and how long it is covered for.",
};

const DETAIL: Record<Condition, { test: string; warranty: string; buy: string; avoid: string }> = {
  new: {
    test: "Still sealed from the factory. We only open it if you ask us to test it before sending.",
    warranty: "The manufacturer covers it if they honour warranties in Pakistan. Where they do not, we cover it.",
    buy: "Anything running your business, anything under a support contract, anything you cannot afford to have down.",
    avoid: "Test and development work, where the money saved buys you a whole second machine.",
  },
  "open-box": {
    test: "Returned by a customer without being used. We test it fully and check it over when it arrives.",
    warranty: "12 months from us.",
    buy: "Anywhere you would buy new. You are only paying less because the box was opened.",
    avoid: "Nothing really. This is the easiest grade for us to recommend.",
  },
  recertified: {
    test: "Sent back to the manufacturer, checked and re-certified by them, with the original serial number still on it.",
    warranty: "12 months from us, and the manufacturer will usually still recognise the serial number.",
    buy: "Business kit where you want to keep the manufacturer's own firmware and support.",
    avoid: "Anywhere you need the original purchase date for a support contract.",
  },
  "refurb-a": {
    test: "Run flat out for 48 hours on the bench. Fresh thermal paste, and fans and pads replaced if worn. Looks nearly new.",
    warranty: "12 months from us.",
    buy: "Our usual recommendation. Behaves like new and costs noticeably less.",
    avoid: "Anywhere an audit would object to a replacement serial sticker.",
  },
  "refurb-b": {
    test: "The same 48-hour test as Grade A. Scuffed, scratched or faded on the outside. Works exactly the same.",
    warranty: "6 months from us.",
    buy: "Anything that lives inside a rack where nobody looks at it. Compute machines, spares, test kit.",
    avoid: "Machines that sit on someone's desk, or anywhere the way it looks is part of the handover.",
  },
  pull: {
    test: "Taken working out of a machine being retired, then cleaned, re-pasted and tested under load. We record the health readings and give them to you.",
    warranty: "3 months from us.",
    buy: "Spares, extra compute machines where a failure just means the job runs again, and things you are experimenting with.",
    avoid: "The main machine, the storage, or the network. Anywhere one failure takes everything down with it.",
  },
};

const ORDER: Condition[] = ["new", "open-box", "recertified", "refurb-a", "refurb-b", "pull"];

export default async function GradingPage() {
  const all = await publicProducts();
  const counts = new Map<Condition, number>();
  for (const p of all) counts.set(p.condition, (counts.get(p.condition) ?? 0) + 1);

  return (
    <div className="shell py-9 md:py-12">
      <header className="max-w-3xl mb-10">
        <p className="t-eyebrow mb-2.5">Reference</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">What the condition grades mean</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          &ldquo;Refurbished&rdquo; means whatever the seller wants it to mean. Here it means one of six specific
          things, each with a written list of the tests it passed and how long it is covered for. The grade is on
          the listing, on the quote and on the invoice, and it is what sets the price. Not a vague feeling about
          how used something looks.
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
                  {n.toLocaleString()} parts
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
          <h2 className="t-display text-[20px]">About used drives</h2>
          <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed">
            Every used SSD comes with its health report attached to the invoice: how many hours it has been running,
            how much has been written to it, and how much life it has left as a percentage. A drive that has used
            4% of its life is a genuinely good buy. One that has used 80% is not, however clean it looks. We will
            not sell you the second one without telling you first.
          </p>
        </div>
        <div className="panel p-6">
          <h2 className="t-display text-[20px]">About used graphics cards</h2>
          <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed">
            Cards that were used for mining turn up a lot here, and they are not automatically bad. A card run at a
            steady, gentle load often had an easier life than one that spent three years heating up and cooling
            down in a gaming PC. What matters is the fans, the thermal pads and the power connector. We check all
            three and replace what needs replacing, and we look at the power connector for the browning that
            usually comes before it fails.
          </p>
        </div>
      </section>
    </div>
  );
}
