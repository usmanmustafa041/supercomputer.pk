import Link from "next/link";
import type { Metadata } from "next";
import QuoteForm from "./QuoteForm";
import { BRAND } from "@/lib/brand";
import { getById } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Request a quote",
  description: "Send us a configuration, or just describe the workload and let us specify it.",
};

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const b = typeof sp.b === "string" ? sp.b : null;
  const sys = typeof sp.sys === "string" ? sp.sys : null;

  // Resolve any build passed through from the configurator so the form opens
  // with the bill of materials already attached.
  const lines: Array<{ product: Product; qty: number }> = [];
  for (const token of [...(b ? b.split(",") : []), ...(sys ? [sys] : [])]) {
    const [id, qty] = token.split("*");
    const product = getById(id);
    if (product) lines.push({ product, qty: Number(qty ?? 1) });
  }

  return (
    <div className="shell py-9 md:py-12">
      <div className="grid lg:grid-cols-[1fr_20rem] gap-10 items-start">
        <div className="min-w-0 max-w-3xl">
          <header className="mb-8">
            <p className="t-eyebrow mb-2.5">Quotation</p>
            <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">
              {lines.length ? "Confirm the configuration" : "Tell us what it has to do"}
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
              {lines.length
                ? "Check the bill of materials below, add anything we should know about the site, and we will come back with a landed PKR price, a lead time and the compatibility report."
                : "You do not need part numbers. Describe the workload — the model you want to fine-tune, the simulation that will not fit in memory, the number of CAD seats you are consolidating — and we will specify it and explain the choices."}
            </p>
          </header>

          {lines.length > 0 && (
            <section className="mb-8">
              <h2 className="t-label mb-3">Attached configuration · {lines.length} lines</h2>
              <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
                {lines.map(({ product, qty }) => (
                  <div key={product.id} className="bg-[var(--color-surface)] flex items-center gap-3 px-4 py-2.5">
                    <span className="t-data text-[11px] text-ink-3 w-8 shrink-0">{qty}x</span>
                    <Link
                      href={`/product/${product.slug}`}
                      className="text-[12.5px] flex-1 min-w-0 truncate hover:text-acc transition-colors"
                    >
                      <span className="text-ink-2">{product.brand}</span> {product.model}
                    </Link>
                    <span className="t-data text-[11px] text-ink-3 shrink-0 hidden sm:inline">{product.id}</span>
                  </div>
                ))}
              </div>
              <Link href={`/configure?b=${b ?? ""}`} className="btn btn-ghost btn-sm mt-3">
                Edit in the configurator
              </Link>
            </section>
          )}

          <QuoteForm lineIds={lines.map((l) => `${l.qty}x ${l.product.brand} ${l.product.model} [${l.product.id}]`)} />
        </div>

        <aside className="lg:sticky lg:top-28 space-y-4">
          <div className="panel p-5">
            <h2 className="t-label mb-3">What you get back</h2>
            <ul className="space-y-3 text-[12.5px] text-ink-1 leading-relaxed">
              {[
                "A landed PKR price, itemised. Duty, GST and clearing are in the number, not added later.",
                "A lead time per line, separating what is on our shelf from what has to be imported.",
                "The full compatibility report, including anything we would change and why.",
                "Where relevant, a cheaper configuration that does the same job — we will tell you if you are overspecifying.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-1.5 w-1 h-1 bg-acc shrink-0" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <h2 className="t-label mb-3">Or talk to someone</h2>
            <dl className="space-y-2.5 text-[12.5px]">
              <div>
                <dt className="t-data text-[10px] text-ink-3 uppercase tracking-wider">Email</dt>
                <dd>
                  <a href={`mailto:${BRAND.email}`} className="text-ink-1 hover:text-acc transition-colors">
                    {BRAND.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="t-data text-[10px] text-ink-3 uppercase tracking-wider">Phone</dt>
                <dd className="text-ink-1">{BRAND.phone}</dd>
              </div>
              <div>
                <dt className="t-data text-[10px] text-ink-3 uppercase tracking-wider">Hours</dt>
                <dd className="text-ink-1">{BRAND.hours}</dd>
              </div>
              <div>
                <dt className="t-data text-[10px] text-ink-3 uppercase tracking-wider">Sites</dt>
                <dd className="text-ink-1">{BRAND.cities.join(" · ")}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
