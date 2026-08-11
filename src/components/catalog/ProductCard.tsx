import Link from "next/link";
import PartArt from "@/components/art/PartArt";
import { CONDITION_LABEL, fmtPkr, type Product } from "@/lib/catalog";

/** Two or three numbers that matter for this kind, for the card face. */
export function keyStats(p: Product): Array<[string, string]> {
  switch (p.kind) {
    case "gpu":
      return [
        ["VRAM", `${p.vramGb}GB`],
        ["BF16", `${p.bf16Tflops} TF`],
        ["Board", `${p.tdpW}W`],
      ];
    case "cpu":
      return [
        ["Cores", `${p.cores}C / ${p.threads}T`],
        ["Boost", `${p.boostGhz} GHz`],
        ["Lanes", `Gen${p.pcieGen} x${p.pcieLanes}`],
      ];
    case "motherboard":
      return [
        ["Socket", `${p.socket}${p.sockets > 1 ? ` x${p.sockets}` : ""}`],
        ["DIMM", `${p.memSlots} slots`],
        ["Slots", `${p.pcieSlots.filter((s) => s.width === 16).length}x x16`],
      ];
    case "memory":
      return [
        ["Capacity", `${p.moduleGb * p.modules}GB`],
        ["Speed", `${p.mts} MT/s`],
        ["Type", `${p.memKind.toUpperCase()}${p.ecc ? " ECC" : ""}`],
      ];
    case "storage":
      return [
        ["Capacity", p.capacityGb >= 1000 ? `${(p.capacityGb / 1000).toFixed(p.capacityGb % 1000 ? 2 : 0)}TB` : `${p.capacityGb}GB`],
        ["Read", `${p.readMbs} MB/s`],
        ["Endurance", p.dwpd ? `${p.dwpd} DWPD` : "HDD"],
      ];
    case "psu":
      return [
        ["Output", `${p.wattage}W`],
        ["Rating", p.efficiency.replace("80+ ", "").replace(/^\w/, (c) => c.toUpperCase())],
        ["Form", p.form.toUpperCase()],
      ];
    case "chassis":
      return [
        ["Form", p.rackU ? `${p.rackU}U rack` : p.form.replace("-", " ")],
        ["GPUs", `${p.maxGpus} max`],
        ["Bays", `${p.hotSwapBays || p.bays35 + p.bays25}`],
      ];
    case "cooler":
      return [
        ["Rated", `${p.tdpRatingW}W`],
        ["Size", p.radiatorMm ? `${p.radiatorMm}mm rad` : `${p.heightMm}mm`],
        ["Noise", p.noiseDba ? `${p.noiseDba} dBA` : "passive"],
      ];
    case "nic":
      return [
        ["Port", `${p.ports}x ${p.portGbps}G`],
        ["Fabric", p.fabric === "both" ? "IB / Eth" : p.fabric === "infiniband" ? "InfiniBand" : "Ethernet"],
        ["Bus", `Gen${p.pcieGen} x${p.pcieWidth}`],
      ];
    case "switch":
      return [
        ["Ports", `${p.ports}x ${p.portGbps}G`],
        ["Capacity", `${p.switchingTbps} Tb/s`],
        ["Height", `${p.rackU}U`],
      ];
    case "optic":
      return [
        ["Rate", `${p.gbps}G`],
        ["Length", p.lengthM ? `${p.lengthM}m` : `${p.reachM}m reach`],
        ["Coded", p.codedFor],
      ];
    case "rack":
      return [
        ["Height", `${p.heightU}U`],
        ["Depth", `${p.depthMm}mm`],
        ["Load", `${p.staticLoadKg}kg`],
      ];
    case "pdu":
      return [
        ["Outlets", `${p.outlets}`],
        ["Capacity", `${p.maxKw}kW`],
        ["Phase", p.phases === 3 ? "3-phase" : "Single"],
      ];
    case "ups":
      return [
        ["Rating", `${p.vaRating / 1000}kVA`],
        ["Output", `${p.wattage}W`],
        ["Type", p.topology === "online-double-conversion" ? "Online" : "Line-int."],
      ];
    case "system":
      return [
        ["Compute", p.gpuCount ? `${p.gpuCount}x ${p.gpuModel?.split(" ").slice(-2).join(" ")}` : `${p.coresTotal} cores`],
        ["Memory", p.memGb >= 1024 ? `${p.memGb / 1024}TB` : `${p.memGb}GB`],
        ["Peak", `${(p.peakPowerW / 1000).toFixed(1)}kW`],
      ];
  }
}

export function StockPill({ p }: { p: Product }) {
  if (p.avail.inHouse > 0) {
    return (
      <span className="pill pill-ok">
        <span className="live-dot" />
        {p.avail.inHouse} in stock
      </span>
    );
  }
  if (p.avail.indentOnly) return <span className="pill pill-cool">Indent · {p.avail.leadDays}d</span>;
  return <span className="pill">Order · {p.avail.leadDays}d</span>;
}

export default function ProductCard({ p, compact = false }: { p: Product; compact?: boolean }) {
  const stats = keyStats(p);

  return (
    <Link href={`/product/${p.slug}`} className="panel-int ticked group flex flex-col">
      <div className="relative aspect-[200/152] overflow-hidden border-b border-[var(--line)] bg-[var(--color-base)]">
        <PartArt
          product={p}
          className="w-full h-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute top-2 left-2">
          <span className={`pill ${p.condition !== "new" ? "pill-acc" : ""}`}>{CONDITION_LABEL[p.condition]}</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1 gap-3">
        <div>
          <div className="t-label text-[10px] mb-1">{p.brand}</div>
          <h3 className="text-[13.5px] font-medium leading-snug clamp-2 group-hover:text-acc transition-colors">
            {p.model}
          </h3>
        </div>

        {!compact && (
          <dl className="grid grid-cols-3 gap-x-2 gap-y-1 border-t border-[var(--line)] pt-2.5 mt-auto">
            {stats.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="t-data text-[9.5px] text-ink-3 uppercase tracking-wider truncate">{k}</dt>
                <dd className="t-data text-[11.5px] text-ink-1 truncate" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex items-end justify-between gap-2 pt-2 border-t border-[var(--line)]">
          <div>
            <div className="t-data text-[15px] font-medium tabular-nums">
              {p.price.onRequest ? "On request" : fmtPkr(p.price.pkr)}
            </div>
            <div className="t-data text-[10px] text-ink-3 mt-0.5">{p.warrantyMonths}mo warranty</div>
          </div>
          <StockPill p={p} />
        </div>
      </div>
    </Link>
  );
}
