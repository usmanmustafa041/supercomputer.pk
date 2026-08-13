import type { Kind } from "@supercomputers/shared";
import type { Target } from "@supercomputers/shared";

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
 * constraint is expressed against them, pick the GPU first and you find out
 * about the case at the end.
 */
export const SLOTS: Slot[] = [
  { kind: "chassis", label: "Chassis", hint: "The case. It decides how long a graphics card can be, how tall the cooler can be, how many drives fit and how well it breathes. Choose it early.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 1, maxNote: "One case per machine. If you need two machines, add a second one instead." },
  { kind: "motherboard", label: "Motherboard", hint: "Everything plugs into this. It decides which processor, which memory and how many cards you can fit.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 1, maxNote: "One motherboard per machine. For two machines, switch to a cluster." },
  { kind: "cpu", label: "Processor", hint: "Has to match the socket on the board, and you need one for every socket you plan to use.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 2, maxNote: "No board we sell takes more than two processors." },
  { kind: "cooler", label: "CPU cooling", hint: "One per processor, and rated for the heat it actually makes when working hard, not the number on the box.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 2, maxNote: "One cooler per processor." },
  { kind: "memory", label: "Memory", hint: "Fill the slots evenly or you lose speed. Server memory will not work in a desktop board and the other way round.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 24, maxNote: "24 slots is the most any board we sell has." },
  { kind: "gpu", label: "Accelerators", hint: "Check it will physically fit, and whether it has its own fans. Server cards do not, and need a case that blows air over them.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 8, maxNote: "Eight cards is the most any case we sell will take." },
  { kind: "storage", label: "Storage", hint: "The drive bays in your case only accept certain types of drive.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 24, maxNote: "24 bays is the most any case we sell has." },
  { kind: "psu", label: "Power supply", hint: "Big enough for the worst moment, not the average, with a proper cable for every card.", defaultQty: 1, core: true, targets: ["desk", "rack", "cluster"], maxPerNode: 4, maxNote: "More than four power supplies is a rack problem, not a single machine." },
  { kind: "nic", label: "Network", hint: "Needs a big enough slot, and a recent enough one, to run at its full speed.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 8 },
  { kind: "switch", label: "Switch", hint: "The ports have to match the network cards you picked.", defaultQty: 1, core: false, targets: ["cluster"], maxPerNode: 4 },
  { kind: "optic", label: "Optics & cables", hint: "Cables are often locked to one brand of switch. The wrong one just will not connect.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 64 },
  { kind: "rack", label: "Rack", hint: "How deep it is and how much air the doors let through, not just how tall.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 1, maxNote: "One rack per build." },
  { kind: "pdu", label: "Power distribution", hint: "Past about 7.4kW you need a three-phase supply.", defaultQty: 1, core: false, targets: ["rack", "cluster"], maxPerNode: 4 },
  { kind: "ups", label: "UPS", hint: "Sized for the full load. Given how the grid behaves here, get the always-on type.", defaultQty: 1, core: false, targets: ["desk", "rack", "cluster"], maxPerNode: 4 },
];

export function slotsFor(target: Target): Slot[] {
  return SLOTS.filter((s) => s.targets.includes(target));
}

/**
 * The house range, and the seed for the presets table.
 *
 * These are the four we ship with. Once the database has them the admin panel
 * owns them, and this array is only ever read again on a first boot against an
 * empty database. Editing it after that changes nothing.
 *
 * Parts are referenced by family key so they survive the catalogue being
 * regenerated. The third element pins a variant. Without it, resolution takes
 * the cheapest SKU in the family, which for a power supply means the lowest
 * wattage and for a memory line means a single module, so every preset shipped
 * undersized and with its channels unpopulated. `npm run preset:test` asserts
 * they are all buildable.
 */
export interface Preset {
  id: string;
  name: string;
  /** What it is, in three or four words, shown above the name. */
  role: string;
  target: Target;
  blurb: string;
  /** [family key, quantity, variant substring matched against the model name] */
  picks: Array<[string, number] | [string, number, string]>;
}

/**
 * A preset as the browser sees it.
 *
 * The database module is server-only, so its row type cannot cross into a
 * client component. This is the same thing with the bookkeeping columns left
 * behind.
 */
export interface PresetView {
  slug: string;
  name: string;
  role: string;
  target: Target;
  blurb: string;
  picks: Array<{ family: string; qty: number; variant?: string }>;
}

/** Falls back to the built-in four when there is no database to ask. */
export function presetsFromStatic(): PresetView[] {
  return PRESETS.map((p) => ({
    slug: p.id,
    name: p.name,
    role: p.role,
    target: p.target,
    blurb: p.blurb,
    picks: p.picks.map(([family, qty, variant]) => ({ family, qty, variant })),
  }));
}

export const PRESETS: Preset[] = [
  {
    id: "atlas-200",
    name: "Atlas 200",
    role: "Deskside AI workstation",
    target: "desk",
    blurb: "A big desktop processor, 128GB of error-correcting memory and two 48GB cards. Fits under a desk on one normal socket.",
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
    id: "meridian-400",
    name: "Meridian 400",
    role: "4U rack inference node",
    target: "rack",
    blurb: "Server processor, proper datacenter cards, two power supplies so one can fail, and fast server drives.",
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
    id: "sentinel-100",
    name: "Sentinel 100",
    role: "Entry rack node",
    target: "rack",
    blurb: "Refurbished server parts. The cheapest way we know to get plenty of card slots and error-correcting memory.",
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
    id: "forge-340",
    name: "Forge 340",
    role: "Open-frame LLM rig",
    target: "desk",
    blurb: "Four 24GB gaming cards on an open frame with room to breathe. No error correction and the cards cannot talk to each other directly, but much cheaper.",
    picks: [
      // The 12-slot frame: four triple-slot cards consume twelve positions.
      ["mining-frame-12", 1],
      ["wrx80e-sage", 1],
      ["tr-5995wx", 1],
      // Air, not liquid, an open frame has nowhere to mount a radiator.
      ["nh-u14s-tr4", 1],
      ["micron-ddr4-rdimm-3200", 1, "8x32GB"],
      ["rtx-3090", 4],
      ["sn850x", 2, "2TB"],
      ["corsair-ax", 2, "1600W"],
    ],
  },
];
