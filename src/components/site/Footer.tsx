import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { VERIFIED_AT } from "@/lib/sourcing/retailers";
import Mark from "./Mark";

const COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    head: "Compute",
    links: [
      ["Graphics & accelerators", "/catalog?kind=gpu"],
      ["Processors", "/catalog?kind=cpu"],
      ["Motherboards", "/catalog?kind=motherboard"],
      ["Memory", "/catalog?kind=memory"],
      ["Storage", "/catalog?kind=storage"],
    ],
  },
  {
    head: "Infrastructure",
    links: [
      ["Chassis & enclosures", "/catalog?kind=chassis"],
      ["Power supplies", "/catalog?kind=psu"],
      ["Network adapters", "/catalog?kind=nic"],
      ["Switches", "/catalog?kind=switch"],
      ["Optics & cables", "/catalog?kind=optic"],
      ["Racks, PDU & UPS", "/catalog?kind=rack"],
    ],
  },
  {
    head: "Systems",
    links: [
      ["AI workstations", "/systems?category=ai-workstation"],
      ["GPU servers", "/systems?category=gpu-server"],
      ["HPC clusters", "/systems?category=cluster"],
      ["Storage nodes", "/systems?category=storage-node"],
      ["Open-frame rigs", "/systems?category=ai-rig"],
    ],
  },
  {
    head: "How this works",
    links: [
      ["Configurator", "/configure"],
      ["Compatibility rules", "/rules"],
      ["Condition grading", "/grading"],
      ["Sourcing network", "/sourcing"],
      ["Request a quote", "/quote"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] mt-24">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Mark className="h-6 w-6 text-acc" />
              <span className="t-display text-[17px]">{BRAND.name}</span>
            </Link>
            <p className="text-[13px] text-ink-1 leading-relaxed max-w-xs">{BRAND.strapline}</p>
            <dl className="mt-6 space-y-2 text-[12px] t-data">
              <div className="flex gap-2">
                <dt className="text-ink-3 w-14">Sales</dt>
                <dd>
                  <a href={`mailto:${BRAND.email}`} className="text-ink-1 hover:text-acc transition-colors">
                    {BRAND.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink-3 w-14">Phone</dt>
                <dd className="text-ink-1">{BRAND.phone}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink-3 w-14">Sites</dt>
                <dd className="text-ink-1">{BRAND.cities.join(" · ")}</dd>
              </div>
            </dl>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.head} aria-label={col.head}>
              <h2 className="t-label mb-3.5">{col.head}</h2>
              <ul className="space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-[13px] text-ink-1 hover:text-ink transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--line)] flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <p className="text-[11px] t-data text-ink-3">
            © {new Date().getFullYear()} {BRAND.legal}. Every configuration is quoted individually, landed in
            Pakistan with duty and taxes included.
          </p>
          <p className="text-[11px] t-data text-ink-3">
            Retailer network last verified {VERIFIED_AT}
          </p>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-ink-3 max-w-3xl">
          Product names and trademarks belong to their respective owners. Specifications are vendor-published figures;
          dense tensor throughput is quoted rather than sparse. Refurbished hardware carries our own warranty, not the
          manufacturer&apos;s, unless the listing states otherwise.
        </p>
      </div>
    </footer>
  );
}
