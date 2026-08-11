/** Prints the 3D placement of a build so geometry bugs are visible as numbers. */
import { getById } from "../src/lib/catalog";
import { layout, ghosts } from "../src/lib/build3d/geometry";
import type { Product } from "../src/lib/catalog/types";

const ids = (process.argv[2] ?? "").split(",").filter(Boolean);
const lines = ids
  .map((tok) => {
    const [id, qty] = tok.split("*");
    const product = getById(id);
    return product ? { product, qty: Number(qty ?? 1) } : null;
  })
  .filter((l): l is { product: Product; qty: number } => l !== null);

console.log(`lines: ${lines.length}`);
for (const l of lines) console.log(`  ${l.qty}x ${l.product.kind.padEnd(12)} ${l.product.model}`);

const { interior, placements } = layout(lines);
console.log(`\ninterior: ${interior.width} x ${interior.height} x ${interior.depth} mm  rack=${interior.rack}`);

console.log("\nplacements:");
const f = (n: number) => String(Math.round(n)).padStart(5);
for (const p of placements) {
  console.log(
    `  ${p.kind.padEnd(12)} size ${f(p.box.size.x)}x${f(p.box.size.y)}x${f(p.box.size.z)}` +
      `  pos ${f(p.box.pos.x)},${f(p.box.pos.y)},${f(p.box.pos.z)}` +
      `  ${p.clips ? "CLIPS" : "ok"}   ${p.label.slice(0, 34)}`
  );
}

console.log("\nghosts:");
for (const g of ghosts(lines)) {
  console.log(
    `  ${g.kind.padEnd(12)} size ${f(g.box.size.x)}x${f(g.box.size.y)}x${f(g.box.size.z)}` +
      `  pos ${f(g.box.pos.x)},${f(g.box.pos.y)},${f(g.box.pos.z)}   ${g.label}`
  );
}
