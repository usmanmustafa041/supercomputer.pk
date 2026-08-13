/**
 * The rule that checks what you can actually see.
 *
 * Every other rule compares declared numbers: card length against chassis
 * clearance, cooler height against the lid. Those catch the cases somebody
 * thought to write a rule for. This one checks the arrangement itself, using
 * the same geometry the viewport draws, so anything that visibly escapes the
 * case or lands on top of something else is reported whether or not a specific
 * rule exists for it.
 *
 * It closes a gap that was doing real damage: the viewport already drew parts
 * red and labelled them "does not fit", while the checks panel said nothing and
 * the configuration counted as buildable. The picture and the verdict
 * disagreed, and the picture was right.
 *
 * Two failures are worth separating:
 *
 *   Escaping the interior is definite. The part is longer, taller or deeper
 *   than the space, and no amount of rearranging changes that, so it blocks.
 *
 *   Overlapping another part is a warning, not a block. The layout here is a
 *   reasonable guess at where things go, not the only arrangement possible: a
 *   drive that collides with a graphics card in this layout may well be fine in
 *   a different bay. Saying "these two are fighting for the same space" is
 *   useful; refusing to quote over it would be wrong.
 */

import type { Product } from "../catalog/types";
import { layout, type Box } from "../build3d/geometry";
import type { Build, Finding } from "./types";

/** Do two boxes share any volume? A shared face does not count. */
function overlaps(a: Box, b: Box): boolean {
  // A millimetre of slack, because parts that sit flush against each other are
  // touching by design and reporting those would bury the real collisions.
  const slack = 1;
  return (
    Math.abs(a.pos.x - b.pos.x) * 2 < a.size.x + b.size.x - slack &&
    Math.abs(a.pos.y - b.pos.y) * 2 < a.size.y + b.size.y - slack &&
    Math.abs(a.pos.z - b.pos.z) * 2 < a.size.z + b.size.z - slack
  );
}

/** How far outside the interior a box reaches, in millimetres, per axis. */
function escapeBy(box: Box, it: { width: number; height: number; depth: number }) {
  const over = (centre: number, size: number, limit: number) =>
    Math.max(0, size / 2 - centre, centre + size / 2 - limit);
  return {
    x: Math.round(over(box.pos.x, box.size.x, it.width)),
    y: Math.round(over(box.pos.y, box.size.y, it.height)),
    z: Math.round(over(box.pos.z, box.size.z, it.depth)),
  };
}

/**
 * Which parts are allowed to overlap.
 *
 * A cooler sits on its processor and a radiator hangs off a fan mount; those
 * are assemblies, not collisions. Reporting them would be noise, and noise is
 * how a checks panel gets ignored.
 */
const ATTACHED = new Set([
  "cpu:cooler", "cooler:cpu",
  "motherboard:cpu", "cpu:motherboard",
  // A cooler bolts through the socket, so its bracket and pump block occupy
  // the board's space by design rather than fighting it for room.
  "motherboard:cooler", "cooler:motherboard",
  "motherboard:memory", "memory:motherboard",
  "motherboard:gpu", "gpu:motherboard",
  "cooler:memory", "memory:cooler",
]);

export function ruleGeometry(b: Build, out: Finding[]): void {
  const chassis = b.lines.find((l) => l.product.kind === "chassis");
  // Without a chassis there is no interior to be inside, and the viewport draws
  // an indicative volume rather than a real one. Nothing to say yet.
  if (!chassis) return;

  const { interior, placements } = layout(b.lines, b.target);
  if (placements.length === 0) return;

  const chassisId = chassis.product.id;
  const chassisModel = (chassis.product as Extract<Product, { kind: "chassis" }>).model;

  /* ------------------------------------------------------ escaping the case */

  // Grouped by product, so eight cards that all overhang are one finding rather
  // than eight copies of the same sentence.
  const escaped = new Map<string, { label: string; worst: number; axis: string; count: number }>();

  for (const p of placements) {
    if (!p.clips) continue;
    const by = escapeBy(p.box, interior);
    const worst = Math.max(by.x, by.y, by.z);
    if (worst <= 0) continue;

    const axis = by.z === worst ? "too deep" : by.y === worst ? "too tall" : "too wide";
    const seen = escaped.get(p.id);
    if (!seen || worst > seen.worst) {
      escaped.set(p.id, { label: p.label, worst, axis, count: (seen?.count ?? 0) + 1 });
    } else {
      seen.count++;
    }
  }

  for (const [id, e] of escaped) {
    out.push({
      rule: "fit.escapes",
      severity: "error",
      title: `${e.label} does not fit inside ${chassisModel}`,
      detail:
        `Laid out to scale, it sits about ${e.worst}mm outside the case: ${e.axis} for the space available. ` +
        `The viewport draws it in red where it breaks the shell.` +
        (e.count > 1 ? ` ${e.count} of them are affected.` : ""),
      refs: [id, chassisId],
      fix: "Choose a smaller part, or a case with room for this one.",
    });
  }

  /* ---------------------------------------------------- fighting for space */

  const collisions = new Map<string, { a: string; b: string; ids: [string, string] }>();

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p = placements[i];
      const q = placements[j];
      if (p.id === q.id) continue; // Two of the same part, stacked by the layout.
      // Anything mounted flat on the board sits under whatever is above it by
      // design, so it is not competing for the space.
      if (p.attached || q.attached) continue;
      if (ATTACHED.has(`${p.kind}:${q.kind}`)) continue;
      if (!overlaps(p.box, q.box)) continue;

      // One finding per pair of products, however many instances collide.
      const key = [p.id, q.id].sort().join("|");
      if (!collisions.has(key)) {
        collisions.set(key, { a: p.label, b: q.label, ids: [p.id, q.id] });
      }
    }
  }

  for (const c of collisions.values()) {
    out.push({
      rule: "fit.collides",
      severity: "warn",
      title: `${c.a} and ${c.b} want the same space`,
      detail:
        "Laid out to scale these two overlap. The arrangement drawn here is one sensible way to fit the " +
        "parts in, not the only one, so this may come down to which bay or slot each ends up in. Worth " +
        "checking before it is built.",
      refs: c.ids,
      fix: "Move one of them to a different bay or slot, or pick a smaller part.",
    });
  }
}
