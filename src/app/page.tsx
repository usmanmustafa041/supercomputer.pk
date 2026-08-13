import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import PartArt from "@/components/art/PartArt";
import HeroFrameScroll from "@/components/home/HeroFrameScroll";
import LiveCheck from "@/components/home/LiveCheck";
import { publicKindCounts, publicProductsByKind, searchPublicProducts } from "@/lib/db/catalog";

export default async function Home() {
  const counts = await publicKindCounts();
  const systems = (await publicProductsByKind("system"))
    .filter((s) => s.condition === "new")
    .sort((a, b) => b.bf16Tflops - a.bf16Tflops || b.coresTotal - a.coresTotal)
    .slice(0, 3);
  const inStock = (await searchPublicProducts({ inStockOnly: true, sort: "perf", perPage: 4 })).items;

  return (
    <>
      {/* ================================================================ hero */}
      <HeroFrameScroll />

      {/* =========================================================== categories */}
      <section id="catalog-start" className="border-b border-[var(--line)] scroll-mt-16">
        <div className="shell py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">Everything we sell</h2>
            <Link href="/catalog" className="btn btn-ghost btn-sm">
              All 15 categories
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
              Change a part.
              <br />
              See what breaks.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-1 max-w-md">
              A server card with no fan of its own, dropped into a desktop case. Four graphics cards
              sharing one power cable. A case 80mm too deep for the rack it has to go in. Fifty checks
              run as you build, and each one tells you what to do instead.
            </p>
            <Link href="/rules" className="btn btn-ghost mt-7">
              See what we check
            </Link>
          </div>

          <LiveCheck />
        </div>
      </section>

      {/* =============================================================== systems */}
      <section className="border-b border-[var(--line)]">
        <div className="shell py-12 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 className="t-display text-[clamp(1.6rem,3.4vw,2.4rem)]">Ready-made systems</h2>
            <Link href="/systems" className="btn btn-ghost btn-sm">
              See all systems
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
                <span className="live-dot" /> In stock right now
              </h2>
              <Link href="/catalog?stock=1" className="btn btn-ghost btn-sm">
                See everything in stock
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
            ["We say what condition it is in", "Six grades, each with a written list of the tests it passed and how long it is covered for. If a part came out of a working machine, we say so.", "/grading"],
            ["It all comes from us", "Every part is from our own stock or brought in on our own import licence. One company to buy from, one invoice, one warranty to call on.", "/catalog"],
            ["Built for how power works here", "230V mains, three-phase once the load gets big, load-shedding and switching over to a generator. The checks take all of that into account.", "/rules"],
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
              Tell us what you need it to do. We will work out the parts.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link href="/configure" className="btn btn-primary">
                Build one now
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
