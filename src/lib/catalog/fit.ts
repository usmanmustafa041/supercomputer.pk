/**
 * Chassis re-homing.
 *
 * When the deployment target changes, the build should move house rather than
 * just complain. This works out what the current parts actually demand of an
 * enclosure, then finds the smallest chassis that satisfies all of it and
 * suits the new target.
 *
 * Pure functions over the catalog — no React, no network.
 */

import { getByKind } from "./index";
import type { Chassis, MoboForm, Product, PsuForm, StorageBus } from "./types";

export type Target = "desk" | "rack" | "cluster";

export interface ChassisNeeds {
  /** Board form factor that must be mountable, if a board is selected. */
  boardForm: MoboForm | null;
  gpuCount: number;
  /** Longest card in the build, mm. */
  maxGpuLengthMm: number;
  /** Rear slot positions consumed by accelerators at their real thickness. */
  slotsNeeded: number;
  /** Tallest air cooler, mm. 0 when liquid or none. */
  coolerHeightMm: number;
  /** Largest AIO radiator, mm. */
  radiatorMm: number;
  psuForms: PsuForm[];
  /** Drives that need a hot-swap bay rather than an internal mount. */
  bayDrives: number;
  /** Buses those drives speak, so the backplane can be matched. */
  driveBuses: StorageBus[];
  /** True when any accelerator is passive and needs forced airflow. */
  needsAirflow: boolean;
}

type Line = { product: Product; qty: number };

export function chassisNeeds(lines: Line[]): ChassisNeeds {
  const need: ChassisNeeds = {
    boardForm: null,
    gpuCount: 0,
    maxGpuLengthMm: 0,
    slotsNeeded: 0,
    coolerHeightMm: 0,
    radiatorMm: 0,
    psuForms: [],
    bayDrives: 0,
    driveBuses: [],
    needsAirflow: false,
  };

  for (const { product: p, qty } of lines) {
    switch (p.kind) {
      case "motherboard":
        need.boardForm = p.form;
        break;
      case "gpu":
        if (p.formFactor !== "pcie") break; // baseboard modules are not slot cards
        need.gpuCount += qty;
        need.maxGpuLengthMm = Math.max(need.maxGpuLengthMm, p.lengthMm);
        need.slotsNeeded += Math.ceil(p.slotsWide) * qty;
        if (p.cooling === "passive") need.needsAirflow = true;
        break;
      case "cooler":
        if (p.tdpRatingW === 0) break; // paste and sundries
        need.coolerHeightMm = Math.max(need.coolerHeightMm, p.heightMm);
        need.radiatorMm = Math.max(need.radiatorMm, p.radiatorMm);
        if (p.needsChassisAirflow) need.needsAirflow = true;
        break;
      case "psu":
        if (!need.psuForms.includes(p.form)) need.psuForms.push(p.form);
        break;
      case "storage":
        if (["u2", "u3", "sas3", "sas4", "e1s", "e3s"].includes(p.bus)) {
          need.bayDrives += qty;
          if (!need.driveBuses.includes(p.bus)) need.driveBuses.push(p.bus);
        }
        break;
      default:
        break;
    }
  }
  return need;
}

/** Which drives a backplane will accept — mirrors the compat engine's table. */
const BACKPLANE_ACCEPTS: Record<string, string[]> = {
  u2: ["u2"],
  u3: ["u3", "u2", "sata", "sas3", "sas4"],
  sas3: ["sas3", "sata"],
  sas4: ["sas4", "sas3", "sata"],
  e1s: ["e1s"],
  e3s: ["e3s"],
  sata: ["sata"],
  none: [],
};

/** Does this chassis satisfy everything the build demands? */
export function chassisSatisfies(c: Chassis, need: ChassisNeeds): boolean {
  if (need.boardForm && !c.moboForms.includes(need.boardForm)) return false;
  if (need.gpuCount > c.maxGpus) return false;
  if (need.maxGpuLengthMm > c.maxGpuLengthMm) return false;
  if (need.slotsNeeded > c.expansionSlots) return false;
  if (need.coolerHeightMm > c.maxCoolerHeightMm) return false;
  if (need.radiatorMm > 0 && need.radiatorMm > c.maxRadiatorMm) return false;
  if (need.psuForms.length && !need.psuForms.some((f) => c.psuForms.includes(f))) return false;
  if (need.needsAirflow && !c.forcedAirflow) return false;
  if (need.bayDrives > 0) {
    if (need.bayDrives > c.hotSwapBays) return false;
    const accepts = BACKPLANE_ACCEPTS[c.backplane] ?? [];
    if (!need.driveBuses.every((b) => accepts.includes(b))) return false;
  }
  return true;
}

/** True when the chassis form suits the deployment target at all. */
export function suitsTarget(c: Chassis, target: Target): boolean {
  return target === "desk" ? c.rackU === 0 : c.rackU > 0;
}

export interface Rehome {
  chassis: Chassis;
  /** Constraints we had to relax to find anything, in plain words. */
  relaxed: string[];
}

/**
 * Best chassis for this build under a new target.
 *
 * Prefers a full fit; if nothing fits everything, relaxes the softest
 * constraints one at a time and reports what it gave up, rather than
 * returning nothing and leaving the user stuck.
 */
export function suggestChassis(lines: Line[], target: Target): Rehome | null {
  const need = chassisNeeds(lines);
  const pool = getByKind("chassis").filter((c) => suitsTarget(c, target));
  if (!pool.length) return null;

  /** Smallest sufficient enclosure, with stock as the tiebreak. */
  const rank = (a: Chassis, b: Chassis) => {
    const size = (c: Chassis) => (c.rackU || 6) * 1000 + c.depthMm;
    return size(a) - size(b) || (b.avail.inHouse > 0 ? 1 : 0) - (a.avail.inHouse > 0 ? 1 : 0);
  };

  const exact = pool.filter((c) => chassisSatisfies(c, need)).sort(rank);
  if (exact.length) return { chassis: exact[0], relaxed: [] };

  // Nothing satisfies everything. Drop the soft constraints in order of how
  // easily a buyer can work around them, and say which ones went.
  const relaxations: Array<[string, (n: ChassisNeeds) => ChassisNeeds]> = [
    ["drive bays", (n) => ({ ...n, bayDrives: 0, driveBuses: [] })],
    ["power supply form factor", (n) => ({ ...n, psuForms: [] })],
    ["cooler height", (n) => ({ ...n, coolerHeightMm: 0, radiatorMm: 0 })],
    ["accelerator clearance", (n) => ({ ...n, maxGpuLengthMm: 0, slotsNeeded: 0, gpuCount: 0 })],
    ["board form factor", (n) => ({ ...n, boardForm: null })],
  ];

  let relaxedNeed = need;
  const given: string[] = [];
  for (const [label, apply] of relaxations) {
    relaxedNeed = apply(relaxedNeed);
    given.push(label);
    const hit = pool.filter((c) => chassisSatisfies(c, relaxedNeed)).sort(rank);
    if (hit.length) return { chassis: hit[0], relaxed: [...given] };
  }

  return { chassis: pool.sort(rank)[0], relaxed: given };
}
