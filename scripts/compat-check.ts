/**
 * Exercises the compatibility engine against builds with known problems.
 * Run: npm run compat:test
 */
import { allProducts, type Product } from "../shared/src/catalog";
import { checkBuild } from "../shared/src/compat/engine";
import type { Build, Target } from "../shared/src/compat/types";

const all = allProducts();
const find = (pred: (p: Product) => boolean, what: string): Product => {
  const hit = all.find(pred);
  if (!hit) throw new Error(`fixture missing: ${what}`);
  return hit;
};

const line = (p: Product, qty = 1) => ({ product: p, qty });

function run(name: string, target: Target, lines: Array<{ product: Product; qty: number }>, expect: string[]) {
  const build: Build = { lines, target };
  const r = checkBuild(build);
  const got = new Set(r.findings.map((f) => f.rule));
  const missing = expect.filter((e) => !got.has(e));

  console.log(`\n${"=".repeat(74)}`);
  console.log(`${name}   [${target}]`);
  console.log(`${"=".repeat(74)}`);
  console.log(
    `buildable=${r.buildable}  errors=${r.errors}  warns=${r.warns}  ` +
      `peak=${r.summary.power.peakW}W  ${r.summary.power.amps230}A@230V  ${r.summary.rackU}U`
  );
  for (const f of r.findings.slice(0, 8)) {
    console.log(`  [${f.severity.toUpperCase().padEnd(5)}] ${f.rule.padEnd(20)} ${f.title}`);
  }
  if (r.findings.length > 8) console.log(`  ... and ${r.findings.length - 8} more`);

  if (missing.length) {
    console.log(`  !! EXPECTED BUT NOT RAISED: ${missing.join(", ")}`);
    failures++;
  } else if (expect.length) {
    console.log(`  ok: all ${expect.length} expected rules fired`);
  }
}

let failures = 0;

// 1. Socket mismatch + wrong memory type + no cooler.
run(
  "Intel CPU on an AMD board with registered memory",
  "desk",
  [
    line(find((p) => p.kind === "cpu" && p.socket === "LGA1700", "LGA1700 cpu")),
    line(find((p) => p.kind === "motherboard" && p.socket === "SP5", "SP5 board")),
    line(find((p) => p.kind === "memory" && p.memKind === "rdimm" && p.memGen === "ddr4", "ddr4 rdimm")),
  ],
  ["cpu.socket", "mem.gen", "cool.missing"]
);

// 2. Passive datacenter GPU dropped into a tower.
run(
  "H100 PCIe in a desktop tower",
  "desk",
  [
    line(find((p) => p.kind === "gpu" && p.family === "h100-pcie", "h100 pcie")),
    line(find((p) => p.kind === "chassis" && p.form === "full-tower", "tower")),
    line(find((p) => p.kind === "motherboard" && p.form === "atx", "atx board")),
  ],
  ["gpu.passive"]
);

// 3. SXM module sold as a loose part.
run(
  "SXM accelerator in a parts build",
  "rack",
  [line(find((p) => p.kind === "gpu" && p.formFactor === "sxm", "sxm gpu"))],
  ["gpu.form"]
);

// 4. Four 575W cards on a small supply, desk target.
const rtx5090 = find((p) => p.kind === "gpu" && p.family === "rtx-5090", "5090");
run(
  "Four RTX 5090s on a 750W supply",
  "desk",
  [
    line(rtx5090, 4),
    line(find((p) => p.kind === "psu" && p.wattage === 750 && p.form === "atx", "750W atx")),
    line(find((p) => p.kind === "chassis" && p.form === "full-tower", "tower")),
  ],
  ["psu.undersized", "power.circuit"]
);

// 5. Memory channels left half-populated on a 12-channel EPYC.
run(
  "EPYC 9654 with 8 DIMMs across 12 channels",
  "rack",
  [
    line(find((p) => p.kind === "cpu" && p.family === "epyc-9654", "9654")),
    line(find((p) => p.kind === "motherboard" && p.socket === "SP5", "SP5 board")),
    line(find((p) => p.kind === "memory" && p.memKind === "rdimm" && p.memGen === "ddr5" && p.modules === 8, "8x ddr5 rdimm kit")),
  ],
  ["mem.channels"]
);

// 6. U.3 drives into a U.2 backplane.
run(
  "U.3 NVMe in a U.2 backplane",
  "rack",
  [
    line(find((p) => p.kind === "storage" && p.bus === "u3", "u3 drive"), 4),
    line(find((p) => p.kind === "chassis" && p.backplane === "u2" && p.hotSwapBays >= 10, "u2 chassis")),
  ],
  ["sto.backplane"]
);

// 7. InfiniBand adapter against an Ethernet switch, mis-coded cable.
run(
  "InfiniBand NIC on an Ethernet switch",
  "cluster",
  [
    line(find((p) => p.kind === "nic" && p.fabric === "infiniband", "ib nic"), 2),
    line(find((p) => p.kind === "switch" && p.fabric === "ethernet", "eth switch")),
  ],
  ["fabric.mismatch"]
);

// 8. Deep GPU chassis in a shallow rack.
run(
  "900mm chassis in a 1000mm rack",
  "rack",
  [
    line(find((p) => p.kind === "chassis" && p.depthMm >= 838, "deep chassis")),
    line(find((p) => p.kind === "rack" && p.depthMm <= 1000, "shallow rack")),
  ],
  ["rack.depth"]
);

// 9. A build that should come out clean.
run(
  "Coherent single-GPU workstation",
  "desk",
  [
    line(find((p) => p.kind === "cpu" && p.family === "r9-9950x" && p.condition === "new", "9950X")),
    line(find((p) => p.kind === "motherboard" && p.family === "b650-tomahawk", "B650 Tomahawk")),
    line(find((p) => p.kind === "memory" && p.family === "kingston-fury-ddr5-6000" && p.modules === 2 && p.moduleGb === 32, "2x32 DDR5")),
    line(find((p) => p.kind === "gpu" && p.family === "rtx-5070ti" && p.slotsWide <= 3, "5070 Ti")),
    line(find((p) => p.kind === "storage" && p.family === "samsung-990pro" && p.capacityGb === 2000, "990 Pro 2TB")),
    line(find((p) => p.kind === "psu" && p.family === "corsair-rmx" && p.wattage === 1000, "RMx 1000")),
    line(find((p) => p.kind === "chassis" && p.family === "fractal-torrent", "Torrent")),
    line(find((p) => p.kind === "cooler" && p.family === "ak620", "AK620")),
  ],
  []
);

console.log(`\n${"=".repeat(74)}`);
console.log(failures === 0 ? "All expectation sets satisfied." : `${failures} case(s) missing expected rules.`);
process.exit(failures === 0 ? 0 : 1);
