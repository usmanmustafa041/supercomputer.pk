import type { Product } from "@/lib/catalog";

const yn = (b: boolean) => (b ? "Yes" : "No");
const mm = (n: number) => `${n} mm`;
const w = (n: number) => `${n} W`;

/**
 * Full spec sheet per kind. Grouped, because a flat 40-row table of a server
 * board is unreadable. Order within a group runs most to least decisive.
 */
export function specGroups(p: Product): Array<[string, Array<[string, string]>]> {
  switch (p.kind) {
    case "gpu":
      return [
        ["Silicon", [
          ["Architecture", p.arch],
          ["Form factor", p.formFactor === "pcie" ? `PCIe ${p.pcieGen}.0 x${p.pcieWidth}` : `${p.formFactor.toUpperCase()} module`],
          ["Slot width", p.formFactor === "pcie" ? `${p.slotsWide} slots` : "n/a — baseboard mounted"],
          ["Card length", p.lengthMm ? mm(p.lengthMm) : "n/a"],
        ]],
        ["Memory", [
          ["Capacity", `${p.vramGb} GB`],
          ["Type", p.vramType.toUpperCase()],
          ["Bus width", `${p.memBusBits}-bit`],
          ["Bandwidth", `${p.memBandwidthGbs} GB/s`],
          ["ECC", yn(p.eccVram)],
        ]],
        ["Throughput", [
          ["FP32", `${p.fp32Tflops} TFLOPS`],
          ["BF16 dense", `${p.bf16Tflops} TFLOPS`],
          ...(p.fp8Tflops ? [["FP8 dense", `${p.fp8Tflops} TFLOPS`] as [string, string]] : []),
        ]],
        ["Power & cooling", [
          ["Board power", w(p.tdpW)],
          ["Recommended supply", p.psuRecW ? w(p.psuRecW) : "System dependent"],
          ["Connectors", p.connectors.length ? p.connectors.join(", ").toUpperCase() : "Slot power only"],
          ["Cooling", p.cooling === "passive" ? "Passive — needs chassis airflow" : p.cooling],
        ]],
        ["Platform features", [
          ["NVLink", yn(p.nvlink)],
          ["MIG partitioning", yn(p.mig)],
          ["vGPU licensable", yn(p.vgpuLicensable)],
          ["Display outputs", p.displayOutputs ? String(p.displayOutputs) : "None — compute only"],
        ]],
      ];

    case "cpu":
      return [
        ["Core", [
          ["Socket", p.socket],
          ["Architecture", p.arch],
          ["Cores / threads", `${p.cores} / ${p.threads}`],
          ["Base / boost", `${p.baseGhz} / ${p.boostGhz} GHz`],
          ["L3 cache", `${p.l3Mb} MB`],
        ]],
        ["Memory controller", [
          ["Generation", p.memGen.toUpperCase()],
          ["Channels", `${p.memChannels} per socket`],
          ["Accepted", p.memKinds.join(", ").toUpperCase()],
          ["Max speed", `${p.memMaxMts} MT/s`],
          ["Max capacity", `${p.maxMemGb >= 1024 ? `${p.maxMemGb / 1024} TB` : `${p.maxMemGb} GB`} per socket`],
          ["ECC", yn(p.eccSupport)],
        ]],
        ["I/O", [
          ["PCIe", `Gen ${p.pcieGen}.0`],
          ["Lanes", `${p.pcieLanes} per socket`],
          ["Multi-socket", p.maxSockets > 1 ? `Up to ${p.maxSockets}P` : "Single socket only"],
        ]],
        ["Power & extras", [
          ["Nameplate TDP", w(p.tdpW)],
          ["Sustained peak", w(p.maxPowerW)],
          ["Cooler included", yn(p.coolerIncluded)],
          ["AVX-512", yn(p.avx512)],
          ["AMX", yn(p.amx)],
          ["Integrated graphics", yn(p.integratedGraphics)],
        ]],
      ];

    case "motherboard":
      return [
        ["Platform", [
          ["Socket", `${p.socket}${p.sockets > 1 ? ` x${p.sockets}` : ""}`],
          ["Chipset", p.chipset],
          ["Form factor", p.form.toUpperCase()],
          ["VRM phases", String(p.vrmPhases)],
          ["EPS headers", `${p.epsHeaders} x 8-pin`],
        ]],
        ["Memory", [
          ["Generation", p.memGen.toUpperCase()],
          ["Slots", String(p.memSlots)],
          ["Accepted", p.memKinds.join(", ").toUpperCase()],
          ["Max speed", `${p.memMaxMts} MT/s`],
          ["Max capacity", p.maxMemGb >= 1024 ? `${p.maxMemGb / 1024} TB` : `${p.maxMemGb} GB`],
          ["ECC", yn(p.eccSupport)],
        ]],
        ["Expansion", [
          ...p.pcieSlots.map((s, i): [string, string] => [
            `Slot ${i + 1}`,
            `Gen ${s.gen}.0 x${s.width} mechanical, x${s.lanes} wired${s.lanes < s.width ? " — narrower than it looks" : ""}`,
          ]),
        ]],
        ["Storage & network", [
          ["M.2 slots", `${p.m2Slots} (up to Gen ${p.m2MaxGen}.0)`],
          ["SATA ports", String(p.sataPorts)],
          ["U.2 ports", String(p.u2Ports)],
          ["Onboard network", `${p.onboardNicPorts} x ${p.onboardNicGbps} GbE`],
          ["Out-of-band management", p.ipmi ? "IPMI 2.0 with dedicated port" : "None"],
          ["BIOS flashback", yn(p.biosFlashback)],
        ]],
      ];

    case "memory":
      return [
        ["Module", [
          ["Generation", p.memGen.toUpperCase()],
          ["Type", p.memKind.toUpperCase()],
          ["Per module", `${p.moduleGb} GB`],
          ["Modules", String(p.modules)],
          ["Kit total", `${p.moduleGb * p.modules} GB`],
          ["Rank", p.ranks],
        ]],
        ["Timing & electrical", [
          ["Speed", `${p.mts} MT/s`],
          ["CAS latency", `CL${p.casLatency}`],
          ["Voltage", `${p.voltage} V`],
          ["ECC", yn(p.ecc)],
          ["Registered", p.registered ? "Yes — server boards only" : "No — unbuffered"],
          ["Height", mm(p.heightMm)],
        ]],
      ];

    case "storage":
      return [
        ["Drive", [
          ["Interface", p.bus.toUpperCase()],
          ["Capacity", p.capacityGb >= 1000 ? `${(p.capacityGb / 1000).toFixed(p.capacityGb % 1000 ? 2 : 0)} TB` : `${p.capacityGb} GB`],
          ["Media", p.media.toUpperCase().replace("-", " ")],
          ["Form factor", p.physical],
          ...(p.pcieGen ? [[`PCIe`, `Gen ${p.pcieGen}.0 x${p.pcieWidth}`] as [string, string]] : []),
        ]],
        ["Performance", [
          ["Sequential read", `${p.readMbs} MB/s`],
          ["Sequential write", `${p.writeMbs} MB/s`],
          ["Random read", `${p.readIops.toLocaleString()} IOPS`],
          ["Random write", `${p.writeIops.toLocaleString()} IOPS`],
        ]],
        ["Endurance & power", [
          ["Endurance", p.dwpd ? `${p.dwpd} DWPD` : "Mechanical — not rated in DWPD"],
          ["Power-loss protection", p.powerLossProtection ? "Yes — onboard capacitors" : "No"],
          ["Active power", w(p.tdpW)],
        ]],
      ];

    case "psu":
      return [
        ["Output", [
          ["Continuous", w(p.wattage)],
          ["Efficiency", p.efficiency.toUpperCase()],
          ["ATX revision", p.atxSpec],
          ["Redundancy", p.redundancy > 1 ? `${p.redundancy - 1}+1 hot-swap` : "None"],
        ]],
        ["Fitment", [
          ["Form factor", p.form.toUpperCase()],
          ["Depth", mm(p.depthMm)],
          ["Modular", p.modular],
          ["Input voltage", `${p.inputVoltsMin}-240 V${p.inputVoltsMin >= 200 ? " — suits 230V Pakistani mains" : ""}`],
        ]],
        ["Connectors", Object.entries(p.connectors).length
          ? Object.entries(p.connectors).map(([k, v]): [string, string] => [k.toUpperCase(), `${v}`])
          : [["Cabling", "Fixed backplane — chassis provides distribution"]]],
      ];

    case "chassis":
      return [
        ["Form", [
          ["Type", p.form.replace("-", " ")],
          ["Rack units", p.rackU ? `${p.rackU}U` : "Tower — not rack mounted"],
          ["Depth", mm(p.depthMm)],
          ["Weight", `${p.weightKg} kg`],
          ["Board support", p.moboForms.join(", ").toUpperCase()],
          ["Supply support", p.psuForms.join(", ").toUpperCase()],
        ]],
        ["Clearance", [
          ["Max GPU length", mm(p.maxGpuLengthMm)],
          ["Max cooler height", mm(p.maxCoolerHeightMm)],
          ["Max radiator", p.maxRadiatorMm ? mm(p.maxRadiatorMm) : "No liquid mounting"],
          ["Expansion slots", String(p.expansionSlots)],
          ["Max accelerators", String(p.maxGpus)],
        ]],
        ["Storage & airflow", [
          ["Hot-swap bays", String(p.hotSwapBays)],
          ["Backplane", p.backplane === "none" ? "None — internal mounting only" : p.backplane.toUpperCase()],
          ['3.5" bays', String(p.bays35)],
          ['2.5" bays', String(p.bays25)],
          ["Forced airflow", p.forcedAirflow ? "Yes — passive cards supported" : "No — active cooling required"],
        ]],
      ];

    case "cooler":
      return [
        ["Cooling", [
          ["Type", p.type.replace("-", " ")],
          ["Rated dissipation", w(p.tdpRatingW)],
          ["Sockets", p.sockets.join(", ")],
          ["Noise", p.noiseDba ? `${p.noiseDba} dBA` : "No fan of its own"],
        ]],
        ["Fitment", [
          ["Height", p.heightMm ? mm(p.heightMm) : "n/a"],
          ["Radiator", p.radiatorMm ? mm(p.radiatorMm) : "n/a"],
          ["Chassis airflow required", p.needsChassisAirflow ? "Yes — will not work in a tower" : "No"],
        ]],
      ];

    case "nic":
      return [
        ["Network", [
          ["Fabric", p.fabric === "both" ? "InfiniBand or Ethernet (VPI)" : p.fabric],
          ["Ports", `${p.ports} x ${p.portGbps} Gb/s`],
          ["Connector", p.portType.toUpperCase()],
        ]],
        ["Host interface", [
          ["PCIe", `Gen ${p.pcieGen}.0 x${p.pcieWidth}`],
          ["Bracket", p.lowProfile ? "Low profile available" : "Full height only"],
          ["Power", w(p.tdpW)],
        ]],
        ["Offloads", [
          ["RDMA", yn(p.rdma)],
          ["SR-IOV", yn(p.sriov)],
          ["GPUDirect", yn(p.gpuDirect)],
        ]],
      ];

    case "switch":
      return [
        ["Switching", [
          ["Fabric", p.fabric],
          ["Ports", `${p.ports} x ${p.portGbps} Gb/s`],
          ["Connector", p.portType.toUpperCase()],
          ["Capacity", `${p.switchingTbps} Tb/s`],
        ]],
        ["Physical", [
          ["Height", `${p.rackU}U`],
          ["Airflow", p.airflow.replace(/-/g, " ")],
          ["Redundant supplies", yn(p.psuRedundant)],
          ["Power", w(p.tdpW)],
          ["Managed", yn(p.managed)],
        ]],
      ];

    case "optic":
      return [
        ["Link", [
          ["Media", p.media.toUpperCase().replace("-", " ")],
          ["Rate", `${p.gbps} Gb/s`],
          ["Connector", p.portType.toUpperCase()],
          ["Fabric", p.fabric === "both" ? "InfiniBand or Ethernet" : p.fabric],
        ]],
        ["Reach & coding", [
          ["Length", p.lengthM ? `${p.lengthM} m` : "Module only — fibre ordered separately"],
          ["Max reach", `${p.reachM} m`],
          ["Vendor coding", p.codedFor],
          ["Power", p.powerW ? w(p.powerW) : "Passive — no power draw"],
        ]],
      ];

    case "rack":
      return [
        ["Enclosure", [
          ["Height", `${p.heightU}U`],
          ["Width", mm(p.widthMm)],
          ["Depth", mm(p.depthMm)],
          ["Static load", `${p.staticLoadKg} kg`],
        ]],
        ["Airflow & power", [
          ["Door perforation", `${p.perforationPct}%`],
          ["PDU positions", String(p.includedPduSlots)],
          ["Shielded", yn(p.shielded)],
        ]],
      ];

    case "pdu":
      return [
        ["Distribution", [
          ["Outlets", `${p.outlets} x ${p.outletType}`],
          ["Capacity", `${p.maxKw} kW`],
          ["Input", `${p.inputAmps} A, ${p.phases === 3 ? "three-phase" : "single-phase"}`],
          ["Voltage", `${p.voltage} V`],
        ]],
        ["Management", [
          ["Metering", yn(p.metered)],
          ["Per-outlet switching", yn(p.switched)],
          ["Mounting", p.rackU ? `${p.rackU}U horizontal` : "Zero-U vertical"],
        ]],
      ];

    case "ups":
      return [
        ["Output", [
          ["Rating", `${p.vaRating / 1000} kVA`],
          ["Real power", w(p.wattage)],
          ["Topology", p.topology.replace(/-/g, " ")],
          ["Outlets", String(p.outlets)],
        ]],
        ["Runtime & fitment", [
          ["Runtime at half load", `${p.runtimeHalfLoadMin} minutes`],
          ["External batteries", yn(p.externalBatterySupport)],
          ["Height", p.rackU ? `${p.rackU}U` : "Tower"],
          ["Input voltage", `${p.inputVolts} V`],
        ]],
      ];

    case "system":
      return [
        ["Compute", [
          ["Processors", p.cpuModel],
          ["Sockets", String(p.cpuSockets)],
          ["Total cores", String(p.coresTotal)],
          ["Accelerators", p.gpuModel ? `${p.gpuCount} x ${p.gpuModel}` : "None — CPU only"],
          ["BF16 aggregate", p.bf16Tflops ? `${p.bf16Tflops} TFLOPS` : "n/a"],
        ]],
        ["Memory & storage", [
          ["Memory", `${p.memGb >= 1024 ? `${p.memGb / 1024} TB` : `${p.memGb} GB`} ${p.memGen.toUpperCase()}`],
          ["Storage", p.storageSummary],
          ["Fabric", p.fabricSummary],
        ]],
        ["Physical & power", [
          ["Nodes", String(p.nodes)],
          ["Rack space", `${p.rackU}U`],
          ["Peak power", `${(p.peakPowerW / 1000).toFixed(2)} kW`],
          ["Heat rejected", `${Math.round(p.peakPowerW * 3.412).toLocaleString()} BTU/hr`],
        ]],
        ["Delivered with", [
          ["Software", p.softwareStack.join(", ")],
          ["Burn-in", `${p.burnInHours} hours under synthetic load`],
        ]],
      ];
  }
}

export default function SpecTable({ p }: { p: Product }) {
  const groups = specGroups(p);
  return (
    <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
      {groups.map(([group, rows]) => (
        <section key={group} className="bg-[var(--color-surface)]">
          <h3 className="t-label px-4 py-2.5 border-b border-[var(--line)]">{group}</h3>
          <dl>
            {rows.map(([k, v], i) => (
              <div
                key={k}
                className={`flex gap-4 px-4 py-2 text-[12.5px] ${i % 2 ? "bg-[var(--wash-2)]" : ""}`}
              >
                <dt className="w-40 md:w-56 shrink-0 text-ink-2">{k}</dt>
                <dd className="t-data text-ink flex-1">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
