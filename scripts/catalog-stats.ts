/** Prints catalog composition. Run: npm run catalog:stats */
import { allProducts, kindCounts, fmtPkr } from "../shared/src/catalog";

const all = allProducts();
console.log(`TOTAL SKUs: ${all.length.toLocaleString()}\n`);

for (const { label, count } of kindCounts().sort((a, b) => b.count - a.count)) {
  console.log(`${String(count).padStart(6)}  ${label}`);
}

const conds = new Map<string, number>();
const brands = new Map<string, number>();
for (const p of all) {
  conds.set(p.condition, (conds.get(p.condition) ?? 0) + 1);
  brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
}

console.log("\nBy condition:");
for (const [k, v] of [...conds].sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(6)}  ${k}`);

console.log(`\nDistinct brands: ${brands.size}`);
console.log("Top brands:", [...brands].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b, n]) => `${b}(${n})`).join(", "));

const prices = all.map((p) => p.price.pkr).sort((a, b) => a - b);
console.log(`\nPrice floor: ${fmtPkr(prices[0])}`);
console.log(`Price median: ${fmtPkr(prices[Math.floor(prices.length / 2)])}`);
console.log(`Price ceiling: ${fmtPkr(prices[prices.length - 1])}`);

const slugs = new Set(all.map((p) => p.slug));
const ids = new Set(all.map((p) => p.id));
console.log(`\nSlug collisions: ${all.length - slugs.size}`);
console.log(`ID collisions:   ${all.length - ids.size}`);
console.log(`In own stock:    ${all.filter((p) => p.avail.inHouse > 0).length}`);
