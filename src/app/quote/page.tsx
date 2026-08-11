import Link from "next/link";
import type { Metadata } from "next";
import QuoteForm, { QuoteLines } from "./QuoteForm";
import { getById } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import type { Target } from "@/lib/compat/types";

export const metadata: Metadata = {
  title: "Request a quote",
  description:
    "Send us a configuration and we come back with availability, lead time and a landed quotation from our own stock.",
};

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const b = typeof sp.b === "string" ? sp.b : "";
  const sys = typeof sp.sys === "string" ? sp.sys : "";
  const target: Target =
    typeof sp.t === "string" && ["desk", "rack", "cluster"].includes(sp.t) ? (sp.t as Target) : "desk";

  // Resolve whatever the configurator or a product page passed through.
  const lines: Array<{ product: Product; qty: number }> = [...b.split(","), sys]
    .filter(Boolean)
    .map((token) => {
      const [id, qty] = token.split("*");
      const product = getById(id);
      return product ? { product, qty: Math.max(1, Number(qty ?? 1)) } : null;
    })
    .filter((l): l is { product: Product; qty: number } => l !== null);

  const editHref = `/configure?t=${target}${
    lines.length ? `&b=${lines.map((l) => (l.qty > 1 ? `${l.product.id}*${l.qty}` : l.product.id)).join(",")}` : ""
  }`;

  return (
    <div className="shell py-9 md:py-12">
      <header className="mb-8 max-w-3xl no-print">
        <p className="t-eyebrow mb-2.5">Quotation</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">
          {lines.length ? "Confirm the configuration" : "Tell us what it has to do"}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          {lines.length
            ? "Check the list below, tell us about the site, and we come back with availability, lead time and a landed quotation from our own stock."
            : "You do not need part numbers. Describe the workload — the model you want to fine-tune, the simulation that will not fit in memory, the number of CAD seats you are consolidating — and we will specify it and explain the choices."}
        </p>
      </header>

      {lines.length > 0 && (
        <section className="mb-8 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="t-label">
              Configuration · {lines.length} line{lines.length === 1 ? "" : "s"}
            </h2>
            <Link href={editHref} className="btn btn-ghost btn-sm">
              Edit in the configurator
            </Link>
          </div>
          <QuoteLines lines={lines} />
        </section>
      )}

      <QuoteForm lines={lines} target={target} />
    </div>
  );
}
