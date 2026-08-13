import Link from "next/link";
import type { Metadata } from "next";
import PartArt from "@/components/art/PartArt";
import { getByKind } from "@supercomputers/shared";

export const metadata: Metadata = {
  title: "Systems",
  description:
    "AI workstations, GPU servers, clusters and storage machines, built and tested before they reach you.",
};

const CATEGORIES: Array<[string, string, string]> = [
  ["ai-workstation", "AI workstations", "Sit next to your desk and run off a normal office socket. No rack needed."],
  ["gpu-server", "GPU servers", "Go in a rack. Two power supplies so one can fail, and air pulled front to back."],
  ["cluster", "Clusters", "Several machines working as one. We rack them, cable them and test them at your site."],
  ["hpc-node", "Extra compute machines", "What you add when an existing cluster needs to get bigger."],
  ["storage-node", "Storage machines", "Packed with fast drives, sized to keep your GPUs fed with data."],
  ["ai-rig", "Open-frame rigs", "Gaming cards on an open frame. Cheaper per GB of graphics memory, less robust."],
];

export default async function SystemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = typeof sp.category === "string" ? sp.category : null;

  const all = getByKind("system").sort((a, b) => a.price.pkr - b.price.pkr);
  const shown = filter ? all.filter((s) => s.category === filter) : all;

  return (
    <div className="shell py-9 md:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="t-eyebrow mb-2.5">Systems</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">
          Built, tested and handed over working
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          Every system arrives with its software stack installed and a burn-in report showing 72 hours at full
          load without fault. Clusters are commissioned and tested on your site, not delivered as a stack of
          boxes. Any of these can be opened in the configurator and altered.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 pb-5 mb-7 border-b border-[var(--line)]" aria-label="System categories">
        <Link href="/systems" className={`btn btn-sm ${!filter ? "btn-primary" : "btn-ghost"}`}>
          All {all.length}
        </Link>
        {CATEGORIES.map(([slug, label]) => {
          const n = all.filter((s) => s.category === slug).length;
          if (!n) return null;
          return (
            <Link
              key={slug}
              href={`/systems?category=${slug}`}
              className={`btn btn-sm ${filter === slug ? "btn-primary" : "btn-ghost"}`}
            >
              {label} {n}
            </Link>
          );
        })}
      </nav>

      {filter && (
        <p className="text-[14px] text-ink-1 mb-7 max-w-2xl leading-relaxed">
          {CATEGORIES.find(([s]) => s === filter)?.[2]}
        </p>
      )}

      <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
        {shown.map((s) => (
          <article key={s.id} className="bg-[var(--color-surface)] p-5 md:p-7 grid md:grid-cols-[13rem_1fr_auto] gap-6">
            <div className="border border-[var(--line)] bg-[var(--color-base)] self-start">
              <PartArt product={s} className="w-full" bare />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="pill pill-acc">{s.category.replace(/-/g, " ")}</span>
                <span className="pill">{s.condition === "new" ? "New build" : "Refurbished"}</span>
                <span className="pill">{s.burnInHours}h burn-in</span>
                <span className="pill">{s.warrantyMonths}mo warranty</span>
              </div>

              <h2 className="t-display text-[24px] md:text-[28px]">
                <Link href={`/product/${s.slug}`} className="hover:text-acc transition-colors">
                  {s.model}
                </Link>
              </h2>

              <dl className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                {([
                  ["Processors", s.cpuModel],
                  ["Accelerators", s.gpuModel ? `${s.gpuCount} x ${s.gpuModel}` : "CPU only"],
                  ["Cores", `${s.coresTotal} total`],
                  ["Memory", `${s.memGb >= 1024 ? `${s.memGb / 1024}TB` : `${s.memGb}GB`} ${s.memGen.toUpperCase()}`],
                  ["Storage", s.storageSummary],
                  ["Fabric", s.fabricSummary],
                  ["Rack space", `${s.rackU}U${s.nodes > 1 ? ` across ${s.nodes} nodes` : ""}`],
                  ["Peak power", `${(s.peakPowerW / 1000).toFixed(1)}kW · ${Math.round(s.peakPowerW / 230)}A at 230V`],
                  ["Heat rejected", `${Math.round(s.peakPowerW * 3.412).toLocaleString("en-GB")} BTU/hr`],
                ] as Array<[string, string]>).map(([k, v]) => (
                  <div key={k} className="flex gap-2 border-b border-[var(--line)] py-1 min-w-0">
                    <dt className="t-data text-[10.5px] text-ink-3 uppercase tracking-wider w-24 shrink-0">{k}</dt>
                    <dd className="t-data text-[11.5px] text-ink-1 truncate" title={v}>{v}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-4 space-y-1.5">
                {s.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5 text-[13px] text-ink-1 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 bg-acc shrink-0" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>

              <p className="mt-4 t-data text-[11px] text-ink-3">
                Ships with {s.softwareStack.join(" · ")}
              </p>
            </div>

            <div className="md:w-52 md:text-right flex md:flex-col items-center md:items-end gap-3 justify-between">
              <div>
                <div className="t-data text-[13px] text-acc uppercase tracking-[0.08em]">Quoted per order</div>
                <p className="t-data text-[10px] text-ink-3 mt-1">
                  {s.avail.leadDays} working days
                </p>
              </div>
              <div className="flex md:flex-col gap-2 md:w-full">
                <Link href={`/quote?sys=${s.id}`} className="btn btn-primary btn-sm md:w-full">
                  Request a quote
                </Link>
                <Link href={`/product/${s.slug}`} className="btn btn-ghost btn-sm md:w-full">
                  Full spec
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-12 border border-[var(--line)] p-7 md:p-10 hatch">
        <div className="max-w-2xl">
          <h2 className="t-display text-[clamp(1.5rem,3.2vw,2.2rem)]">
            None of these quite fits?
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-1">
            These are starting points, not a fixed menu. Open the configurator and change anything you like; the
            compatibility engine will hold you to what those changes cost in power, thermal budget and rack
            space.
          </p>
          <Link href="/configure" className="btn btn-primary mt-6">
            Configure from scratch
          </Link>
        </div>
      </section>
    </div>
  );
}
