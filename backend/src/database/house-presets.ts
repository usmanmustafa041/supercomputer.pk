/**
 * The four pre-built configurations the system ships with.
 *
 * Only ever read on a first boot against an empty database. After that the
 * presets table is the source of truth and the admin panel owns it, so editing
 * this file changes nothing on a running system.
 *
 * Parts are referenced by family key so they survive the catalogue being
 * regenerated, with a variant hint where the family has members that differ in
 * a way that matters. Without the hint, resolution takes the family's cheapest
 * member: for a power supply that is its lowest wattage and for a memory line a
 * single module, so every preset would ship undersized with its channels
 * unpopulated.
 */

import type { PresetPick, PresetTarget } from "../presets/preset.types";

export interface HousePreset {
  slug: string;
  name: string;
  role: string;
  target: PresetTarget;
  blurb: string;
  picks: PresetPick[];
}

const pick = (family: string, qty: number, variant?: string): PresetPick => ({ family, qty, variant });

export const HOUSE_PRESETS: HousePreset[] = [
  {
    slug: "atlas-200",
    name: "Atlas 200",
    role: "Deskside AI workstation",
    target: "desk",
    blurb:
      "A big desktop processor, 128GB of error-correcting memory and two 48GB cards. Fits under a desk on one normal socket.",
    picks: [
      pick("fractal-define7-xl", 1),
      // TRX50 rather than WRX90: WRX90 wants three EPS headers and no ATX
      // supply made provides more than two.
      pick("trx50-aero", 1),
      pick("tr-7965wx", 1),
      pick("tr-aio-360", 1),
      pick("vcolor-ddr5-rdimm-ws", 1, "4x32GB"),
      pick("rtx-6000-ada", 2),
      pick("samsung-990pro", 2, "2TB"),
      pick("corsair-ax", 1, "1600W"),
    ],
  },
  {
    slug: "meridian-400",
    name: "Meridian 400",
    role: "4U rack inference node",
    target: "rack",
    blurb:
      "Server processor, proper datacenter cards, two power supplies so one can fail, and fast server drives.",
    picks: [
      pick("smc-cse-418", 1),
      // E-ATX: the 4U GPU chassis has no ATX standoffs.
      pick("mz33-ar0", 1),
      pick("epyc-9354p", 1),
      pick("smc-snk-p0064ap4", 1),
      // Twelve modules so every Genoa channel is populated.
      pick("sk-ddr5-rdimm-5600", 1, "12x32GB"),
      pick("l40s", 4),
      // U.2 to match the chassis backplane; U.3 drives will not enumerate in it.
      pick("samsung-pm9a3", 4, "3.84TB"),
      pick("smc-crps-2u-hi", 2, "5250W"),
      pick("cx6-hdr", 1),
    ],
  },
  {
    slug: "sentinel-100",
    name: "Sentinel 100",
    role: "Entry rack node",
    target: "rack",
    blurb:
      "Refurbished server parts. The cheapest way we know to get plenty of card slots and error-correcting memory.",
    picks: [
      pick("smc-cse-745", 1),
      pick("h12ssl-i", 1),
      pick("epyc-7313", 1),
      pick("dynatron-a24", 1),
      pick("micron-ddr4-rdimm-3200", 1, "8x32GB"),
      // SATA to match the SAS3 backplane, which accepts SATA but not U.2.
      pick("samsung-pm893", 2, "1.92TB"),
      pick("smc-crps", 2, "1600W"),
      pick("cx5-edr", 1),
    ],
  },
  {
    slug: "forge-340",
    name: "Forge 340",
    role: "Open-frame LLM rig",
    target: "desk",
    blurb:
      "Four 24GB gaming cards on an open frame with room to breathe. No error correction and the cards cannot talk to each other directly, but much cheaper.",
    picks: [
      // The 12-slot frame: four triple-slot cards consume twelve positions.
      pick("mining-frame-12", 1),
      pick("wrx80e-sage", 1),
      pick("tr-5995wx", 1),
      // Air, not liquid, an open frame has nowhere to mount a radiator.
      pick("nh-u14s-tr4", 1),
      pick("micron-ddr4-rdimm-3200", 1, "8x32GB"),
      pick("rtx-3090", 4),
      pick("sn850x", 2, "2TB"),
      pick("corsair-ax", 2, "1600W"),
    ],
  },
];
