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
}

/**
 * Build order matters. Chassis and board first, because almost every other
 * constraint is expressed against them — pick the GPU first and you find out
 * about the case at the end.
 */
export const SLOTS: Slot[] = [
  { kind: "chassis", label: "Chassis", hint: "Sets GPU clearance, cooler height, bay count and airflow. Decide this early.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "motherboard", label: "Motherboard", hint: "Socket, memory type, slot widths and lane wiring all come from here.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "cpu", label: "Processor", hint: "Must match the board socket. Quantity must equal populated sockets.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "cooler", label: "CPU cooling", hint: "One per socket, rated for peak power — not nameplate TDP.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "memory", label: "Memory", hint: "Populate every channel. Registered parts will not post in a consumer board.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "gpu", label: "Accelerators", hint: "Check slot width, card length and whether the card has fans of its own.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"] },
  { kind: "storage", label: "Storage", hint: "The backplane decides what the bays will actually accept.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "psu", label: "Power supply", hint: "Sized on peak including GPU transients, with native cables per card.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"] },
  { kind: "nic", label: "Network", hint: "Needs a wide enough slot at a high enough PCIe generation to hit line rate.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"] },
  { kind: "switch", label: "Switch", hint: "Port type and fabric must match the adapters.", defaultQty: 1, core: false, targets: ["cluster"] },
  { kind: "optic", label: "Optics & cables", hint: "Vendor coding matters — a mis-coded cable simply will not link.", defaultQty: 1, core: false, targets: ["rack", "cluster"] },
  { kind: "rack", label: "Rack", hint: "Depth and door perforation, not just height.", defaultQty: 1, core: false, targets: ["rack", "cluster"] },
  { kind: "pdu", label: "Power distribution", hint: "Above roughly 7.4kW you need three-phase.", defaultQty: 1, core: false, targets: ["rack", "cluster"] },
  { kind: "ups", label: "UPS", hint: "Sized on peak load. Double-conversion given local grid behaviour.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"] },
];

export function slotsFor(target: Target): Slot[] {
  return SLOTS.filter((s) => s.targets.includes(target));
}

/** Prefilled starting points, referenced by family key so they survive re-expansion. */
export interface Preset {
  id: string;
  name: string;
  target: Target;
  blurb: string;
  /** [family key, quantity] pairs resolved against the catalog at load. */
  picks: Array<[string, number]>;
}

export const PRESETS: Preset[] = [
  {
    id: "ws-dual-ada",
    name: "Dual-GPU AI workstation",
    target: "desk",
    blurb: "Threadripper PRO, 256GB ECC, two blower-style 48GB cards. Fits under a desk on one 230V circuit.",
    picks: [
      ["fractal-define7-xl", 1], ["wrx90e-sage", 1], ["tr-7965wx", 1], ["nh-u9-tr5", 1],
      ["vcolor-ddr5-rdimm-ws", 1], ["rtx-6000-ada", 2], ["samsung-990pro", 2],
      ["corsair-ax", 1],
    ],
  },
  {
    id: "rack-inference",
    name: "4U inference node",
    target: "rack",
    blurb: "EPYC host, passive datacenter cards, redundant CRPS power, U.2 NVMe throughout.",
    picks: [
      ["smc-cse-418", 1], ["h13ssl-n", 1], ["epyc-9354p", 1], ["smc-snk-p0064ap4", 1],
      ["sk-ddr5-rdimm-5600", 1], ["l40s", 4], ["kioxia-cd8", 4],
      ["smc-crps-2u-hi", 2], ["cx6-hdr", 1],
    ],
  },
  {
    id: "budget-lab",
    name: "Budget ECC lab node",
    target: "rack",
    blurb: "Refurbished Milan platform. The cheapest honest route to 128 PCIe lanes and ECC memory.",
    picks: [
      ["smc-cse-745", 1], ["h12ssl-i", 1], ["epyc-7313", 1], ["sp3-4u-tower", 1],
      ["micron-ddr4-rdimm-3200", 1], ["samsung-pm9a3", 2], ["smc-crps", 2],
      ["cx5-edr", 1],
    ],
  },
  {
    id: "local-llm-rig",
    name: "Open-frame local LLM rig",
    target: "desk",
    blurb: "Four 24GB consumer cards on risers with real spacing. No ECC, no NVLink, considerably cheaper.",
    picks: [
      ["mining-frame-8", 1], ["wrx80e-sage", 1], ["tr-5995wx", 1], ["nh-u9-tr5", 1],
      ["micron-ddr4-rdimm-3200", 1], ["rtx-3090", 4], ["sn850x", 2], ["corsair-ax", 2],
    ],
  },
];
