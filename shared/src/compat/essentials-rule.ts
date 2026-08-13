/**
 * The parts a machine cannot do without.
 *
 * The parts list has always marked seven slots REQUIRED, but only two of them,
 * the cooler and the power supply, were ever actually checked. So a
 * configuration with no chassis, no board, no processor and no memory reported
 * itself buildable, and the interface disagreed with itself: the slot said
 * REQUIRED while the badge said BUILDABLE.
 *
 * The awkward part is that a configurator is used incrementally. Nobody wants
 * to be told they have no motherboard three seconds after adding their first
 * graphics card. So nothing here fires until the configuration looks like
 * somebody building a machine rather than somebody browsing: at least two
 * lines, including something that computes.
 *
 * That is the same instinct the existing rules already had. `cool.missing` only
 * fires once there is a processor to cool, and `psu.missing` once there is
 * something to power. This extends it to the rest rather than inventing a new
 * idea.
 */

import type { Build, Finding } from "./types";

interface Essential {
  kind: "chassis" | "motherboard" | "cpu" | "memory" | "storage";
  rule: string;
  severity: "error" | "warn";
  title: string;
  detail: string;
  fix: string;
}

const ESSENTIALS: Essential[] = [
  {
    kind: "chassis",
    rule: "chs.missing",
    severity: "error",
    title: "No chassis in the configuration",
    detail:
      "Nothing here has anywhere to mount. The chassis also decides how long a card can be, how tall the " +
      "cooler can be and how many drives fit, so choosing it changes what else is possible.",
    fix: "Pick a chassis. It is worth doing first, because most other limits come from it.",
  },
  {
    kind: "motherboard",
    rule: "mb.missing",
    severity: "error",
    title: "No motherboard in the configuration",
    detail: "Everything plugs into the board. Without one there is nothing to connect the parts together.",
    fix: "Pick a motherboard that takes the processor you want.",
  },
  {
    kind: "cpu",
    rule: "cpu.missing",
    severity: "error",
    title: "No processor in the configuration",
    detail: "A machine with no processor will not start. Accelerators need a host to drive them.",
    fix: "Pick a processor matching the board's socket.",
  },
  {
    kind: "memory",
    rule: "mem.missing",
    severity: "error",
    title: "No memory in the configuration",
    detail: "A machine with no memory will not post. It will power on, fail its memory check and stop.",
    fix: "Add memory the board actually takes: server boards want registered modules, desktop boards do not.",
  },
  {
    kind: "storage",
    rule: "sto.missing",
    severity: "warn",
    title: "No storage in the configuration",
    detail:
      "Nothing to install an operating system on. That is deliberate on some cluster nodes, which boot over " +
      "the network from a head node, so this is worth confirming rather than blocking.",
    fix: "Add a drive, or tell us in the request that these nodes boot over the network.",
  },
];

export function ruleEssentials(b: Build, out: Finding[]): void {
  // Nothing to say about an empty configuration; it is already not buildable
  // and a list of seven complaints on a blank page helps nobody.
  if (b.lines.length < 2) return;

  const present = new Set(b.lines.map((l) => l.product.kind));

  // Only once somebody is actually assembling a machine. Ordering a rack, a
  // switch and some optics is a legitimate configuration that needs none of
  // this.
  const buildingAMachine =
    present.has("motherboard") || present.has("cpu") || present.has("gpu") || present.has("memory");
  if (!buildingAMachine) return;

  for (const e of ESSENTIALS) {
    if (present.has(e.kind)) continue;
    out.push({
      rule: e.rule,
      severity: e.severity,
      title: e.title,
      detail: e.detail,
      // Nothing to point at: the finding is about something absent, so it refs
      // nothing and no part gets drawn red for it.
      refs: [],
      fix: e.fix,
    });
  }
}
