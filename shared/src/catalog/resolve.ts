/**
 * Turning family keys back into concrete parts.
 *
 * Presets point at families rather than SKUs, because the catalogue is
 * generated and a SKU id is not a stable thing to store. This is the other half
 * of that trade: the lookup that puts real parts back.
 *
 * Shared by the configurator's feed and the admin screen that edits presets, so
 * what an administrator sees listed under a preset is exactly what a customer
 * will get when they load it.
 */

import { getByKind, type Kind, type Product } from "./index";

const KINDS: Kind[] = [
  "chassis", "motherboard", "cpu", "cooler", "memory", "gpu", "storage",
  "psu", "nic", "switch", "optic", "rack", "pdu", "ups",
];

/** Cheapest of what we hold, else cheapest at all. */
function preferred(a: Product, b: Product): Product {
  const better =
    (a.avail.inHouse > 0 ? 0 : 1) - (b.avail.inHouse > 0 ? 0 : 1) || a.price.pkr - b.price.pkr;
  return better < 0 ? a : b;
}

function scan(wanted: Map<string, string | null>, honourHints: boolean): Map<string, Product> {
  const found = new Map<string, Product>();
  for (const kind of KINDS) {
    for (const p of getByKind(kind)) {
      if (!wanted.has(p.family)) continue;
      const hint = honourHints ? wanted.get(p.family) : null;
      if (hint && !p.model.toLowerCase().includes(hint.toLowerCase())) continue;
      const cur = found.get(p.family);
      found.set(p.family, cur ? preferred(p, cur) : p);
    }
  }
  return found;
}

/**
 * One product per family, honouring the variant hint where it matches.
 *
 * A hint that matches nothing falls back to the family's cheapest member rather
 * than resolving to nothing. Losing the line without a word means a preset
 * quietly arriving without its power supply; the wrong-sized member at least
 * makes the compatibility checks complain out loud.
 */
export function resolveFamilies(wanted: Map<string, string | null>): Map<string, Product> {
  const byFamily = scan(wanted, true);

  const unresolved = [...wanted.keys()].filter((f) => !byFamily.has(f));
  if (unresolved.length > 0) {
    const loose = scan(wanted, false);
    for (const family of unresolved) {
      const fallback = loose.get(family);
      if (fallback) byFamily.set(family, fallback);
    }
  }
  return byFamily;
}
