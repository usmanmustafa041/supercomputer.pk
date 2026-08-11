/**
 * Presets are advertised as known-good starting points, so any blocking
 * finding in one is a bug in the preset. Run: npm run preset:test
 */
import { getByKind, type Product } from "../src/lib/catalog";
import { PRESETS } from "../src/app/configure/slots";
import { checkBuild } from "../src/lib/compat/engine";

/** Mirrors the /api/catalog?families= resolution the configurator uses. */
function resolveFamily(fam: string, hint?: string): Product | null {
  const kinds = [
    "chassis", "motherboard", "cpu", "cooler", "memory", "gpu",
    "storage", "psu", "nic", "switch", "optic", "rack", "pdu", "ups",
  ] as const;
  let best: Product | null = null;
  for (const k of kinds) {
    for (const p of getByKind(k)) {
      if (p.family !== fam) continue;
      if (hint && !p.model.toLowerCase().includes(hint.toLowerCase())) continue;
      if (!best) { best = p; continue; }
      const better =
        (p.avail.inHouse > 0 ? 0 : 1) - (best.avail.inHouse > 0 ? 0 : 1) ||
        p.price.pkr - best.price.pkr;
      if (better < 0) best = p;
    }
  }
  return best;
}

let failures = 0;

for (const preset of PRESETS) {
  const lines = preset.picks
    .map(([fam, qty, hint]) => {
      const product = resolveFamily(fam, hint);
      if (!product) console.log(`  !! family not found: ${fam}`);
      return product ? { product, qty } : null;
    })
    .filter((l): l is { product: Product; qty: number } => l !== null);

  const r = checkBuild({ lines, target: preset.target });
  const blocking = r.findings.filter((f) => f.severity === "error");
  const warns = r.findings.filter((f) => f.severity === "warn");

  console.log(`\n${"=".repeat(72)}`);
  console.log(`${preset.name}  [${preset.target}]  ${lines.length} lines`);
  console.log(`${"=".repeat(72)}`);
  console.log(`blocking=${blocking.length}  warn=${warns.length}  peak=${r.summary.power.peakW}W`);

  for (const f of blocking) {
    console.log(`  BLOCKING  ${f.rule.padEnd(22)} ${f.title}`);
    console.log(`            ${f.detail.slice(0, 150)}`);
    failures++;
  }
  for (const f of warns) console.log(`  warn      ${f.rule.padEnd(22)} ${f.title}`);
}

console.log(`\n${"=".repeat(72)}`);
console.log(failures === 0 ? "All presets are buildable." : `${failures} blocking finding(s) across presets.`);
process.exit(failures === 0 ? 0 : 1);
