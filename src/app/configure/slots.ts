import type { Kind } from "@/lib/catalog/types";
import type { Target } from "@/lib/compat/types";

export interface Slot {
  kind: Kind;
  label: string;
  /** Short line about what this slot is for and what usually goes wrong. */
  hint: string;
  /** Sensible starting quantity when a part is first added. */
  defaultQty: number;
  /** Slots we prompt for even in a minimal build. */
  core: boolean;
  /** Targets where this slot is relevant at all. */
  targets: Target[];
  /**
   * How many of this part a single node can physically take.
   *
   * Memory and drives multiply freely; a node has exactly one motherboard and
   * one chassis however many you click. Without this the quantity control let
   * you specify twelve boards for one machine and only ever drew the first.
   */
  maxPerNode: number;
  /** Shown when the ceiling is reached, so the refusal has a reason. */
  maxNote?: string;
}

/**
 * Build order matters. Chassis and board first, because almost every other
 * constraint is expressed against them — pick the GPU first and you find out
 * about the case at the end.
 */
export const SLOTS: Slot[] = [
  { kind: "chassis", label: "Chassis", hint: "Sets GPU clearance, cooler height, bay count and airflow. Decide this early.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 1, maxNote: "A node has one chassis. For more machines, quote them as separate nodes." },
  { kind: "motherboard", label: "Motherboard", hint: "Socket, memory type, slot widths and lane wiring all come from here.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 1, maxNote: "A node has one motherboard. Two machines means two quotes, or a multi-node cluster." },
  { kind: "cpu", label: "Processor", hint: "Must match the board socket. Quantity must equal populated sockets.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 2, maxNote: "No board here takes more than two sockets." },
  { kind: "cooler", label: "CPU cooling", hint: "One per socket, rated for peak power — not nameplate TDP.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 2, maxNote: "One heatsink per populated socket." },
  { kind: "memory", label: "Memory", hint: "Populate every channel. Registered parts will not post in a consumer board.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 24, maxNote: "24 DIMM slots is the largest board in the catalog." },
  { kind: "gpu", label: "Accelerators", hint: "Check slot width, card length and whether the card has fans of its own.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 8, maxNote: "Eight accelerators is the densest chassis we sell." },
  { kind: "storage", label: "Storage", hint: "The backplane decides what the bays will actually accept.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 24, maxNote: "24 bays is the largest backplane in the catalog." },
  { kind: "psu", label: "Power supply", hint: "Sized on peak including GPU transients, with native cables per card.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 4, maxNote: "Beyond four supplies you are describing a rack feed, not a node." },
  { kind: "nic", label: "Network", hint: "Needs a wide enough slot at a high enough PCIe generation to hit line rate.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 8 },
  { kind: "switch", label: "Switch", hint: "Port type and fabric must match the adapters.", defaultQty: 1, core: false, targets: ["cluster"], maxPerNode: 4 },
  { kind: "optic", label: "Optics & cables", hint: "Vendor coding matters — a mis-coded cable simply will not link.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 64 },
  { kind: "rack", label: "Rack", hint: "Depth and door perforation, not just height.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 1, maxNote: "One cabinet per configuration." },
  { kind: "pdu", label: "Power distribution", hint: "Above roughly 7.4kW you need three-phase.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 4 },
  { kind: "ups", label: "UPS", hint: "Sized on peak load. Double-conversion given local grid behaviour.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 4 },
];

export function slotsFor(target: Target): Slot[] {
  return SLOTS.filter((s) => s.targets.includes(target));
}

/**
 * Prefilled starting points, referenced by family key so they survive
 * re-expansion of the catalog.
 *
 * The third element pins a variant. Without it, resolution takes the cheapest
 * SKU in the family, which for a power supply means the lowest wattage and for
 * a memory line means a single module — so every preset shipped undersized and
 * with its channels unpopulated. `npm run preset:test` asserts they are all
 * buildable.
 */
export interface Preset {
  id: string;
  name: string;
  target: Target;
  blurb: string;
  /** [family key, quantity, variant substring matched against the model name] */
  picks: Array<[string, number] | [string, number, string]>;
}

export const PRESETS: Preset[] = [
  {
    id: "ws-dual-ada",
    name: "Dual-GPU AI workstation",
    target: "desk",
    blurb: "Threadripper PRO, 128GB ECC, two 48GB ECC cards. Fits under a desk on one 230V circuit.",
    picks: [
      ["fractal-define7-xl", 1],
      // TRX50 rather than WRX90: WRX90 wants three EPS headers and no ATX
      // supply made provides more than two.
      ["trx50-aero", 1],
      ["tr-7965wx", 1],
      ["tr-aio-360", 1],
      ["vcolor-ddr5-rdimm-ws", 1, "4x32GB"],
      ["rtx-6000-ada", 2],
      ["samsung-990pro", 2, "2TB"],
      ["corsair-ax", 1, "1600W"],
    ],
  },
  {
    id: "rack-inference",
    name: "4U inference node",
    target: "rack",
    blurb: "EPYC host, passive datacenter cards, redundant CRPS power, U.2 NVMe throughout.",
    picks: [
      ["smc-cse-418", 1],
      // E-ATX: the 4U GPU chassis has no ATX standoffs.
      ["mz33-ar0", 1],
      ["epyc-9354p", 1],
      ["smc-snk-p0064ap4", 1],
      // Twelve modules so every Genoa channel is populated.
      ["sk-ddr5-rdimm-5600", 1, "12x32GB"],
      ["l40s", 4],
      // U.2 to match the chassis backplane; U.3 drives will not enumerate in it.
      ["samsung-pm9a3", 4, "3.84TB"],
      ["smc-crps-2u-hi", 2, "5250W"],
      ["cx6-hdr", 1],
    ],
  },
  {
    id: "budget-lab",
    name: "Budget ECC lab node",
    target: "rack",
    blurb: "Refurbished Milan platform. The cheapest honest route to 128 PCIe lanes and ECC memory.",
    picks: [
      ["smc-cse-745", 1],
      ["h12ssl-i", 1],
      ["epyc-7313", 1],
      ["dynatron-a24", 1],
      ["micron-ddr4-rdimm-3200", 1, "8x32GB"],
      // SATA to match the SAS3 backplane, which accepts SATA but not U.2.
      ["samsung-pm893", 2, "1.92TB"],
      ["smc-crps", 2, "1600W"],
      ["cx5-edr", 1],
    ],
  },
  {
    id: "local-llm-rig",
    name: "Open-frame local LLM rig",
    target: "desk",
    blurb: "Four 24GB consumer cards on risers with real spacing. No ECC, no NVLink, considerably cheaper.",
    picks: [
      // The 12-slot frame: four triple-slot cards consume twelve positions.
      ["mining-frame-12", 1],
      ["wrx80e-sage", 1],
      ["tr-5995wx", 1],
      // Air, not liquid — an open frame has nowhere to mount a radiator.
      ["nh-u14s-tr4", 1],
      ["micron-ddr4-rdimm-3200", 1, "8x32GB"],
      ["rtx-3090", 4],
      ["sn850x", 2, "2TB"],
      ["corsair-ax", 2, "1600W"],
    ],
  },
];
