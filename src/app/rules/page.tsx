import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compatibility rules",
  description: "Every check the configurator runs, what it means, and why it blocks or merely warns.",
};

type Sev = "error" | "warn" | "info" | "gain";

const SEV: Record<Sev, { pill: string; label: string }> = {
  error: { pill: "pill-err", label: "Blocking" },
  warn: { pill: "pill-warn", label: "Warning" },
  info: { pill: "pill-cool", label: "Note" },
  gain: { pill: "pill-ok", label: "Opportunity" },
};

const GROUPS: Array<{
  area: string;
  intro: string;
  rules: Array<[string, Sev, string, string]>;
}> = [
  {
    area: "Processor and board",
    intro: "The socket check everyone does, plus the ones that catch people out on multi-socket platforms.",
    rules: [
      ["cpu.socket", "error", "Socket mismatch", "The processor and board are different sockets. The chip will not seat."],
      ["cpu.count", "error", "More processors than sockets", "Quantity exceeds what the board physically has."],
      ["cpu.mixed", "error", "Mixed processor models", "Multi-socket systems need identical stepping, core count and TDP. Mismatched CPUs halt at POST."],
      ["cpu.maxSockets", "error", "Part is single-socket only", "The P-series SKUs are fused to refuse multi-socket operation despite being physically identical."],
      ["cpu.halfPopulated", "warn", "Second socket empty", "Half the DIMM slots and several PCIe slots are wired to CPU2 and will not function."],
      ["chassis.form", "error", "Board will not mount", "The chassis has standoffs for other form factors."],
      ["chassis.ipmi", "warn", "Rack node without out-of-band management", "Every failed boot becomes a site visit."],
    ],
  },
  {
    area: "Cooling",
    intro: "Rated dissipation against real sustained power, not the nameplate figure on the box.",
    rules: [
      ["cool.missing", "error", "No cooler", "None of the selected processors ships with a heatsink."],
      ["cool.count", "error", "Fewer coolers than sockets", "Every populated socket needs its own."],
      ["cool.socket", "error", "No mounting for this socket", "Server sockets in particular have almost no aftermarket bracket options."],
      ["cool.capacity", "error", "Cooler undersized", "Rated below the processor's sustained peak. Escalates from warning to blocking past 25% short."],
      ["cool.height", "error", "Too tall for the chassis", "The panel or lid will not close."],
      ["cool.radiator", "error", "Radiator will not mount", "Larger than the chassis accepts."],
      ["cool.airflow", "error", "Passive heatsink in a chassis without forced airflow", "Rack heatsinks have no fan and do nothing in a tower."],
    ],
  },
  {
    area: "Memory",
    intro: "The channel-population rule is the one that silently costs a third of your bandwidth.",
    rules: [
      ["mem.gen", "error", "DDR4 module in a DDR5 board or vice versa", "Different keying — it cannot be inserted."],
      ["mem.kind", "error", "Board does not accept this module type", "Registered memory will not train on a consumer controller, and unbuffered will not initialise on a server one."],
      ["mem.slots", "error", "More modules than slots", ""],
      ["mem.max", "error", "Above the board's qualified ceiling", ""],
      ["mem.cpuMax", "error", "Above the processor's addressable ceiling", ""],
      ["mem.channels", "warn", "Uneven channel population", "The controller falls back to a slower interleave. On a 12-channel EPYC, eight modules costs roughly a third of memory bandwidth."],
      ["mem.ecc", "warn", "ECC modules in a board without ECC support", "They run, but correction stays off and single-bit errors pass silently."],
      ["mem.cpuEcc", "warn", "Processor does not support ECC", "Intel restricts ECC to Xeon and W-series."],
      ["mem.clearance", "warn", "Tall modules under a wide air cooler", "Anything over about 40mm fouls the cooler's front fan."],
      ["mem.speed", "info", "Modules will clock down", "You are paying for speed the platform cannot use."],
    ],
  },
  {
    area: "Accelerators",
    intro: "Physical fit, airflow, and the lane arithmetic that decides whether cards run at the width their connector implies.",
    rules: [
      ["gpu.form", "error", "SXM or OAM module in a parts build", "These mount to a vendor baseboard sold as a complete system. There is no PCIe edge connector."],
      ["gpu.length", "error", "Card longer than the chassis clearance", ""],
      ["gpu.passive", "error", "Passive card without chassis airflow", "Datacenter accelerators have no fans and throttle within a minute in a tower."],
      ["gpu.count", "error", "More accelerators than the chassis supports", ""],
      ["gpu.slots", "error", "Not enough rear slot positions", "Triple-slot coolers consume neighbouring positions even though they use one PCIe connector."],
      ["gpu.mbSlots", "error", "More cards than x16 slots", ""],
      ["gpu.laneWidth", "warn", "A card will land in an electrically narrow slot", "It works, but host bandwidth is halved. Visible in multi-GPU training, not in gaming."],
      ["pcie.lanes", "warn", "Lane budget oversubscribed", "GPUs, network and NVMe together exceed what the processor provides."],
      ["gpu.mixed", "warn", "Mixed accelerator models", "Data-parallel training runs at the pace of the slowest card and is bounded by its VRAM."],
      ["gpu.pcieGen", "info", "Card negotiates down a PCIe generation", ""],
      ["gpu.nvlinkOdd", "info", "Odd number of NVLink-capable cards", "Bridges pair cards two at a time; one ends up unbridged."],
      ["gpu.nvlinkSolo", "gain", "NVLink unused with a single card", "A second identical card and a bridge gives one pooled memory space."],
    ],
  },
  {
    area: "Storage",
    intro: "The backplane decides what the bays will accept, and the direction of U.2/U.3 compatibility surprises people.",
    rules: [
      ["sto.backplane", "error", "Drive type the backplane cannot speak", "U.3 backplanes accept U.2, SATA and SAS. U.2 backplanes accept U.2 only — the connector mates but a U.3 drive will not enumerate."],
      ["sto.bays", "error", "More enterprise drives than bays", ""],
      ["sto.m2", "error", "More M.2 drives than slots", ""],
      ["sto.sata", "error", "More SATA devices than ports", ""],
      ["sto.plp", "warn", "Consumer NVMe in a server build", "Without power-loss protection an outage can lose already-acknowledged writes."],
      ["sto.m2Length", "info", "110mm M.2 module", "30mm longer than 2280. Many desktop boards have no standoff for it."],
      ["sto.qlc", "info", "QLC in a training build", "Right for the read-heavy dataset tier, wrong for checkpoints and scratch."],
    ],
  },
  {
    area: "Power",
    intro: "Sized on peak including GPU transients, and checked connector by connector. Adapters are where GPU power problems start.",
    rules: [
      ["psu.missing", "error", "No supply in the build", ""],
      ["psu.undersized", "error", "Capacity below peak draw", "The unit shuts down under load, usually mid-job."],
      ["psu.conn12v", "error", "Not enough native 12VHPWR leads", "Running a 450W-plus card off a four-way 8-pin adapter is the most common cause of melted connectors."],
      ["psu.connPcie", "error", "Not enough PCIe cables", "Daisy-chaining two GPU connectors onto one cable exceeds its 150W rating."],
      ["psu.connEps", "error", "Not enough EPS connectors for the board", "An empty header causes shutdowns under all-core load — it passes a quick test and fails a real job."],
      ["psu.form", "error", "Supply will not mount in the chassis", ""],
      ["psu.mains", "error", "Requires more than 230V", "Pakistani single-phase mains is 230V/50Hz."],
      ["psu.headroom", "warn", "Under 20% headroom", "Running near the ceiling shortens life, maxes the fan and leaves nothing for expansion."],
      ["psu.atxSpec", "warn", "ATX 2.4 supply feeding a 12VHPWR card", "Pre-3.0 units trip their over-current protection on the transients these cards produce."],
      ["psu.redundancy", "warn", "Single non-redundant supply in a rack build", ""],
      ["power.circuit", "warn", "Over a single 230V circuit's continuous rating", "A 16A Pakistani domestic circuit is 3.68kW; continuous load should stay under about 2.9kW."],
      ["psu.gpuEps", "info", "Accelerator uses a CPU-style power lead", "Keyed differently from PCIe 8-pin. Plugging a PCIe cable in damages the card."],
      ["psu.mains200", "info", "Requires 200-240V", "Suits Pakistani mains; will not start on 110V."],
    ],
  },
  {
    area: "Fabric",
    intro: "Port type, protocol and vendor coding have to line up end to end. Two of the three fail silently.",
    rules: [
      ["fabric.mismatch", "error", "InfiniBand-only adapters with an Ethernet switch", "The cable is identical and the connectors mate, but the protocols are unrelated."],
      ["fabric.ethOnIb", "error", "Ethernet-only adapters with an InfiniBand switch", ""],
      ["optic.nicPort", "error", "Cable does not fit any adapter", "Cage sizes are not interchangeable."],
      ["optic.swPort", "error", "Cable does not fit the switch", ""],
      ["nic.slot", "error", "No slot wide enough", ""],
      ["nic.profile", "error", "Full-height card in a 1U chassis", ""],
      ["optic.coding", "warn", "Cable coded for a different vendor", "Most switches read the module EEPROM and refuse to bring the port up. Electrically fine, firmware says no."],
      ["nic.bandwidth", "warn", "Adapter cannot reach line rate on this board", ""],
      ["fabric.noCable", "warn", "Adapters and switch with no cabling", "Ports ship empty; optics are a meaningful share of the fabric budget."],
      ["fabric.vpiEth", "info", "VPI adapters will run in Ethernet mode", "You keep RoCE and GPUDirect, you lose in-network reduction."],
      ["fabric.gpudirect", "gain", "Multi-GPU node without a GPUDirect adapter", "Every gradient exchange bounces through host memory."],
    ],
  },
  {
    area: "Facility",
    intro: "Rack depth, door perforation, distribution capacity and holdover — the constraints that live outside the box.",
    rules: [
      ["rack.height", "error", "Equipment exceeds rack height", ""],
      ["rack.depth", "error", "Chassis too deep", "You need roughly 150mm behind the equipment for cable bend radius and the vertical PDU."],
      ["pdu.capacity", "error", "Load exceeds distribution capacity", ""],
      ["ups.capacity", "error", "UPS smaller than the load", "An overloaded UPS drops to bypass, doing nothing at the moment it is needed."],
      ["rack.perforation", "warn", "Door perforation below 65% with GPU nodes", "The doors become the thermal restriction."],
      ["pdu.phase", "warn", "Over 8kW on single-phase", "Beyond about 7.4kW a single-phase 32A feed is exhausted."],
      ["ups.topology", "warn", "Line-interactive UPS on a multi-GPU load", "Given local grid behaviour, double-conversion is the safer specification."],
      ["ups.missing", "warn", "No UPS", "Load-shedding will otherwise cut a running job and risk the filesystem."],
    ],
  },
];

export default function RulesPage() {
  const total = GROUPS.reduce((n, g) => n + g.rules.length, 0);

  return (
    <div className="shell py-9 md:py-12">
      <header className="max-w-3xl mb-10">
        <p className="t-eyebrow mb-2.5">Reference</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">
          Every check the configurator runs
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          {total} rules across eight areas. Blocking findings stop a configuration being quoted as-is. Warnings
          do not — you may have a reason, and it is your machine. Notes and opportunities are there so nothing
          about the build is a surprise after it arrives.
        </p>
        <Link href="/configure" className="btn btn-primary mt-7">
          Try it on a build
        </Link>
      </header>

      <div className="space-y-10">
        {GROUPS.map((g) => (
          <section key={g.area}>
            <h2 className="t-display text-[24px]">{g.area}</h2>
            <p className="text-[13.5px] text-ink-1 mt-2 mb-4 max-w-3xl leading-relaxed">{g.intro}</p>
            <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
              {g.rules.map(([id, sev, title, detail]) => (
                <div key={id} className="bg-[var(--color-surface)] px-4 py-3 grid md:grid-cols-[7rem_1fr] gap-2 md:gap-5">
                  <div className="flex md:block items-center gap-2">
                    <span className={`pill ${SEV[sev].pill}`}>{SEV[sev].label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h3 className="text-[13px] font-medium">{title}</h3>
                      <code className="t-data text-[10.5px] text-ink-3">{id}</code>
                    </div>
                    {detail && <p className="text-[12.5px] text-ink-1 mt-1 leading-relaxed">{detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 panel p-6 md:p-8 max-w-3xl">
        <h2 className="t-display text-[20px]">What these rules cannot tell you</h2>
        <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed">
          They check that a machine will assemble, boot and stay within its electrical and thermal envelope. They
          do not check that it is the right machine for your workload. Four 16GB cards and one 64GB card both pass
          every rule here; only one of them will hold the model you are trying to train. That judgement is what
          the quote conversation is for.
        </p>
      </section>
    </div>
  );
}
