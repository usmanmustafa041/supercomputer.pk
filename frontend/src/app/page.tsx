import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import PartArt from "@/components/art/PartArt";
import LiveCheck from "@/components/home/LiveCheck";
import { api } from "@/lib/api/client";
import type { SearchResult } from "@supercomputers/shared";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [all, systems, inStock, counts] = await Promise.all([
    api<SearchResult>("/catalog?page=1&perPage=1"),
    api<SearchResult>("/catalog?kind=system&stock=1&page=1&perPage=3&sort=perf"),
    api<SearchResult>("/catalog?stock=1&page=1&perPage=4&sort=perf"),
    api<Record<string, number>>("/products/counts"),
  ]);
  const total = all.total;
  const heldLines = inStock.total;
  const systemItems = systems.items.filter((product): product is Extract<typeof product, { kind: "system" }> => product.kind === "system");

  // Ticker content: real catalogue numbers, not invented marketing ones.
  const ticker = [
    `${total.toLocaleString("en-GB")} parts catalogued`,
    "50 compatibility checks",
    "6 condition grades",
    `${heldLines.toLocaleString("en-GB")} lines in stock`,
    "Specified for 230V and generator supply",
    "Quotations within one working day",
    "72 hours of burn-in on every system",
    "Lahore · Karachi · Islamabad",
  ];

  return (
    <>
      {/* ================================================================ hero */}
      <section className="hero-band relative border-b border-[var(--line)] overflow-hidden">
        {/*
          The photograph is a CSS background, not an <img>. Which of the two
          applies is a question only the theme can answer, and the theme is
          settled by a script before first paint rather than on the server. Two
          <img> tags with one hidden would fetch both; a background image that
          does not apply is never requested at all.
        */}
        <div className="hero-photo" aria-hidden />
        <div className="hero-scrim" aria-hidden />

        {/*
          The type is held to a column narrow enough to clear the rack, which
          begins a little past halfway across the frame. max-w-xl rather than a
          percentage: a percentage of a 2560px monitor puts the last word of
          every line straight onto the machine.
        */}
        <div className="shell relative py-16 md:py-24 lg:py-28">
          <div className="max-w-xl">
            <p className="t-eyebrow mb-5 rise">Refurbished HPC, supplied and supported in Pakistan</p>

            <h1 className="t-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.06] rise" style={{ animationDelay: "60ms" }}>
              Supercomputing hardware,
              <br />
              <span className="text-acc">specified properly.</span>
            </h1>

            <p
              className="mt-5 text-[15px] md:text-[16.5px] leading-relaxed text-ink-1 max-w-md rise"
              style={{ animationDelay: "120ms" }}
            >
              Server clusters, GPU systems and AI workstations. Specify the configuration here and we verify that
              it fits, powers and cools before you commit to anything.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 rise" style={{ animationDelay: "180ms" }}>
              <Link href="/configure" className="btn btn-primary">
                Open the configurator
              </Link>
              <Link href="/catalog" className="btn btn-ghost">
                Browse {total.toLocaleString("en-GB")} parts
              </Link>
            </div>
          </div>
        </div>

        {/* Ticker. Its own solid background rather than floating on the
            photograph: small monospace over a rack full of detail is not
            reading matter in either theme. */}
        <div className="relative border-t border-[var(--line)] py-2.5 overflow-hidden marquee-host bg-[var(--color-base)]">
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
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">From processors to rack doors</h2>
            <Link href="/catalog" className="btn btn-ghost btn-sm">
              All 15 categories
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-t border-l border-[var(--line)]">
            {Object.entries(counts).map(([kind, count]) => (
              <Link
                key={kind}
                href={`/catalog?kind=${kind}`}
                className="group relative border-r border-b border-[var(--line)] p-4 md:p-5 hover:bg-[var(--color-raised)] transition-colors"
              >
                <div className="t-data text-[10px] text-ink-3 tabular-nums">{String(count).padStart(4, "0")}</div>
                <h3 className="text-[13.5px] font-medium mt-2 leading-snug group-hover:text-acc transition-colors">
                    {kind}
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
              Change one part.
              <br />
              See what it breaks.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-1 max-w-md">
              A passively cooled server card dropped into a desktop chassis. Four graphics cards sharing one
              power cable. A chassis 80mm too deep for the rack it has to go in. Fifty checks run as you
              configure, and each one states the alternative.
            </p>
            <Link href="/rules" className="btn btn-ghost mt-7">
              Read the compatibility rules
            </Link>
          </div>

          <LiveCheck />
        </div>
      </section>

      {/* =============================================================== systems */}
      <section className="border-b border-[var(--line)]">
        <div className="shell py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">Systems, ready to order</h2>
            <Link href="/systems" className="btn btn-ghost btn-sm">
              All systems
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {systemItems.map((sys) => (
              <Link key={sys.id} href={`/product/${sys.slug}`} className="panel-int ticked group flex flex-col">
                <div className="border-b border-[var(--line)] bg-[var(--color-base)] overflow-hidden">
                  <PartArt
                    product={sys}
                    className="w-full transition-transform duration-500 group-hover:scale-[1.05]"
                    bare
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="t-label text-[10px]">{String(sys.category ?? "system").replace(/-/g, " ")}</span>
                  <h3 className="t-display text-[19px] mt-1.5 group-hover:text-acc transition-colors">{sys.model}</h3>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-2.5">
                    {[
                      ["GPU", sys.gpuCount || 0],
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
                    Request a quote
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== in stock */}
      {inStock.items.length > 0 && (
        <section className="border-b border-[var(--line)] bg-[var(--color-base)]">
          <div className="shell py-12 md:py-16">
            <div className="flex items-end justify-between gap-4 mb-7">
              <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)] flex items-center gap-3">
                <span className="live-dot" /> In stock now
              </h2>
              <Link href="/catalog?stock=1" className="btn btn-ghost btn-sm">
                Everything in stock
              </Link>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {inStock.items.map((p) => (
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
            ["Graded honestly, in writing", "Six condition grades, each with a published list of the tests it passed and the warranty term that follows. A tested pull is labelled as a tested pull.", "/grading"],
            ["Stocked and supported by us", "Every part comes from our own inventory or our own import licence. One supplier, one invoice, one warranty to call on.", "/catalog"],
            ["Specified for power as it is here", "230V mains, three-phase once the load grows, load-shedding and generator transfer. The checks account for all of it.", "/rules"],
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
              <Link href="/configure" className="btn btn-primary">
                Configure a system
              </Link>
              <Link href="/systems" className="btn btn-ghost">
                Start from a ready-made system
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
