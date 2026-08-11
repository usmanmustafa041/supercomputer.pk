import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import PartArt from "@/components/art/PartArt";
import HeroRig from "@/components/home/HeroRig";
import LiveCheck from "@/components/home/LiveCheck";
import { catalogSize, getByKind, kindCounts, search } from "@/lib/catalog";

export default function Home() {
  const total = catalogSize();
  const counts = kindCounts();
  const systems = getByKind("system")
    .filter((s) => s.condition === "new")
    .sort((a, b) => b.bf16Tflops - a.bf16Tflops || b.coresTotal - a.coresTotal)
    .slice(0, 3);
  const inStock = search({ inStockOnly: true, sort: "perf", perPage: 4 }).items;
  const heldLines = search({ inStockOnly: true, perPage: 1 }).total;

  // Ticker content: real catalog extremes, not invented marketing numbers.
  const ticker = [
    `${total.toLocaleString()} SKUs`,
    "50 compatibility rules",
    "6 condition grades",
    `${heldLines.toLocaleString()} lines in stock`,
    "230V / 3-phase aware",
    "Quotes in one working day",
    "72h burn-in on systems",
    "NDR400 InfiniBand",
    "Lahore · Karachi · Islamabad",
  ];

  return (
    <>
      {/* ================================================================ hero */}
      <section className="relative border-b border-[var(--line)] overflow-hidden">
        <div className="absolute inset-0 grid-field pointer-events-none" aria-hidden />
        <div
          className="absolute -top-52 left-1/4 w-[52rem] h-[42rem] pointer-events-none opacity-[0.18]"
          style={{
            background: "radial-gradient(ellipse at center, var(--color-acc) 0%, transparent 62%)",
          }}
          aria-hidden
        />

        <div className="shell relative py-14 md:py-20 grid lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-6 rise">
              <span className="live-dot" />
              <span className="t-eyebrow">Lahore stock live</span>
            </div>

            <h1 className="t-display text-[clamp(2.8rem,8vw,6.2rem)] rise" style={{ animationDelay: "60ms" }}>
              Compute that
              <br />
              <span className="text-acc">actually fits.</span>
            </h1>

            <p
              className="mt-6 text-[16px] md:text-[18px] leading-relaxed text-ink-1 max-w-lg rise"
              style={{ animationDelay: "120ms" }}
            >
              Refurbished HPC clusters, GPU servers and AI workstations. Configure it here and we check every
              socket, lane, watt and millimetre before you pay.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 rise" style={{ animationDelay: "180ms" }}>
              <Link href="/configure" className="btn btn-primary">
                Start configuring
              </Link>
              <Link href="/catalog" className="btn btn-ghost">
                {total.toLocaleString()} parts
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-[30rem] rise" style={{ animationDelay: "240ms" }}>
            <HeroRig />
          </div>
        </div>

        {/* ticker */}
        <div className="border-t border-[var(--line)] py-2.5 overflow-hidden marquee-host">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                {ticker.map((t) => (
                  <span key={t} className="flex items-center gap-6 px-6 t-data text-[11px] text-ink-2 whitespace-nowrap">
                    {t}
                    <span className="w-1 h-1 bg-acc" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================== categories */}
      <section className="border-b border-[var(--line)]">
        <div className="shell py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">Die to rack door</h2>
            <Link href="/catalog" className="btn btn-ghost btn-sm">
              All 15
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-t border-l border-[var(--line)]">
            {counts.map(({ kind, label, count }) => (
              <Link
                key={kind}
                href={`/catalog?kind=${kind}`}
                className="group relative border-r border-b border-[var(--line)] p-4 md:p-5 hover:bg-[var(--color-raised)] transition-colors"
              >
                <div className="t-data text-[10px] text-ink-3 tabular-nums">{String(count).padStart(4, "0")}</div>
                <h3 className="text-[13.5px] font-medium mt-2 leading-snug group-hover:text-acc transition-colors">
                  {label}
                </h3>
                <span
                  className="absolute bottom-0 left-0 h-px w-full bg-acc origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= configurator */}
      <section className="border-b border-[var(--line)] bg-[var(--color-base)]">
        <div className="shell py-12 md:py-16 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="t-eyebrow mb-3">The configurator</p>
            <h2 className="t-display text-[clamp(1.9rem,4.4vw,3.2rem)]">
              Swap a part.
              <br />
              Watch it break.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-1 max-w-md">
              Passive cards in a tower. Four GPUs on one 12VHPWR lead. A chassis 80mm too deep for the rack.
              Fifty rules, and each one says what to do instead.
            </p>
            <Link href="/rules" className="btn btn-ghost mt-7">
              Read the rules
            </Link>
          </div>

          <LiveCheck />
        </div>
      </section>

      {/* =============================================================== systems */}
      <section className="border-b border-[var(--line)]">
        <div className="shell py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">Racked and running</h2>
            <Link href="/systems" className="btn btn-ghost btn-sm">
              All systems
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {systems.map((sys) => (
              <Link key={sys.id} href={`/product/${sys.slug}`} className="panel-int ticked group flex flex-col">
                <div className="border-b border-[var(--line)] bg-[var(--color-base)] overflow-hidden">
                  <PartArt
                    product={sys}
                    className="w-full transition-transform duration-500 group-hover:scale-[1.05]"
                    bare
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="t-label text-[10px]">{sys.category.replace(/-/g, " ")}</span>
                  <h3 className="t-display text-[19px] mt-1.5 group-hover:text-acc transition-colors">{sys.model}</h3>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-2.5">
                    {[
                      ["GPU", sys.gpuCount || "—"],
                      ["Cores", sys.coresTotal],
                      ["kW", (sys.peakPowerW / 1000).toFixed(1)],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="t-data text-[9px] text-ink-3 uppercase tracking-wider">{k}</dt>
                        <dd className="t-data text-[13px]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="t-data text-[12px] text-acc mt-auto pt-3 uppercase tracking-[0.08em]">
                    Get a quote
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== in stock */}
      {inStock.length > 0 && (
        <section className="border-b border-[var(--line)] bg-[var(--color-base)]">
          <div className="shell py-12 md:py-16">
            <div className="flex items-end justify-between gap-4 mb-7">
              <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)] flex items-center gap-3">
                <span className="live-dot" /> On the shelf
              </h2>
              <Link href="/catalog?stock=1" className="btn btn-ghost btn-sm">
                Everything in stock
              </Link>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {inStock.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= three */}
      <section className="border-b border-[var(--line)]">
        <div className="shell py-12 md:py-16 grid gap-px bg-[var(--line)] md:grid-cols-3 border border-[var(--line)] mt-0">
          {[
            ["Graded honestly", "Six condition grades, each with a written test regime and warranty term. Tested pulls are labelled as tested pulls.", "/grading"],
            ["Stocked and supported", "Everything ships from our own inventory or our own import channel. One supplier, one invoice, one warranty to call on.", "/catalog"],
            ["Specified locally", "230V mains, three-phase past 7.4kW, load-shedding and generator transfer. The rules account for all of it.", "/rules"],
          ].map(([title, body, href]) => (
            <Link key={title} href={href} className="bg-[var(--color-surface)] p-6 md:p-8 group hover:bg-[var(--color-raised)] transition-colors">
              <h3 className="t-display text-[20px] group-hover:text-acc transition-colors">{title}</h3>
              <p className="text-[13.5px] text-ink-1 mt-3 leading-relaxed">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================== cta */}
      <section>
        <div className="shell py-14 md:py-20">
          <div className="border border-[var(--line)] p-8 md:p-14 hatch text-center">
            <h2 className="t-display text-[clamp(1.8rem,4.4vw,3rem)] max-w-2xl mx-auto">
              Tell us the workload, not the part numbers.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link href="/quote" className="btn btn-primary">
                Request a quote
              </Link>
              <Link href="/configure" className="btn btn-ghost">
                Configure it yourself
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
