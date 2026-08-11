/**
 * SKU expansion.
 *
 * Families describe a real part. Real parts ship in variants: a die goes to
 * six board partners who each build two or three tiers of card, and every one
 * of those turns up on the Pakistani market in four condition grades. This
 * file does that multiplication deterministically, so a SKU id generated at
 * build time matches the one generated in the browser.
 */

import {
  CHASSIS, COOLERS, CPUS, GPUS, MEMORY, MOBOS, NICS, OPTICS, PDUS, PSUS,
  RACKS, STORAGE, SWITCHES, SYSTEMS, UPSES,
} from "./registry";
import type {
  Availability, Chassis, Condition, Cooler, Cpu, Gpu, Memory, Money,
  Motherboard, Nic, Optic, Pdu, Product, Psu, Rack, Storage, Switch, System, Ups,
} from "./types";

/* ---------------------------------------------------------------- pricing */

/**
 * USD → PKR. Sitting in one place on purpose: when the rupee moves, this is
 * the only number that changes. Everything downstream derives from it.
 */
export const FX_USD_PKR = 281;

/**
 * Landed cost multiplier. Pakistani import of computer hardware carries
 * customs duty, 18% sales tax, withholding and clearing/freight. Components
 * and complete systems clear under different headings, hence two rates.
 */
const LANDED = { part: 1.34, system: 1.28 } as const;

/** What each condition grade does to price, and what warranty it carries. */
const COND_FACTOR: Record<Condition, { price: number; warranty: number }> = {
  new: { price: 1.0, warranty: 12 },
  "open-box": { price: 0.9, warranty: 12 },
  recertified: { price: 0.78, warranty: 12 },
  "refurb-a": { price: 0.7, warranty: 12 },
  "refurb-b": { price: 0.58, warranty: 6 },
  pull: { price: 0.46, warranty: 3 },
};

/* ------------------------------------------------------- deterministic rng */

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable pseudo-random in [0,1) from a string seed. */
function rand(seed: string): number {
  let t = (fnv1a(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Stable integer in [min, max]. */
function randInt(seed: string, min: number, max: number): number {
  return min + Math.floor(rand(seed) * (max - min + 1));
}

function pick<T>(seed: string, arr: readonly T[]): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Round to something a Pakistani price list would actually print. */
function roundPkr(n: number): number {
  if (n < 20000) return Math.round(n / 100) * 100;
  if (n < 500000) return Math.round(n / 500) * 500;
  return Math.round(n / 5000) * 5000;
}

function money(usd: number, cond: Condition, seed: string, kind: "part" | "system" = "part"): Money {
  // ±4% dealer-to-dealer spread so the catalog does not look machine-priced.
  const spread = 0.96 + rand(seed + ":px") * 0.08;
  const pkr = roundPkr(usd * FX_USD_PKR * LANDED[kind] * COND_FACTOR[cond].price * spread);
  return { pkr };
}

/**
 * Stock. Anything above USD 8k is indent-only — we do not sit on H100s, and
 * pretending otherwise in the UI would be a lie the customer discovers late.
 */
function avail(seed: string, usd: number, cond: Condition): Availability {
  const indentOnly = usd > 8000 || cond === "new" && usd > 20000;
  const r = rand(seed + ":stock");
  const inHouse = indentOnly ? 0 : r > 0.55 ? randInt(seed + ":qty", 1, cond === "new" ? 12 : 5) : 0;
  const leadDays = indentOnly ? randInt(seed + ":lead", 18, 45) : inHouse > 0 ? 0 : randInt(seed + ":lead", 5, 16);
  return { inHouse, leadDays, indentOnly };
}

/* -------------------------------------------------- board partner catalogue */

interface Tier {
  /** Suffix appended to the model name. */
  suffix: string;
  /** Clock/power uplift over reference. */
  power: number;
  /** Extra card length in mm. */
  lenAdd: number;
  /** Extra slot thickness. */
  slotAdd: number;
  /** Price multiplier over reference. */
  price: number;
  note: string;
}

const TIERS: Record<string, Tier[]> = {
  ASUS: [
    { suffix: "ROG Strix OC", power: 1.06, lenAdd: 22, slotAdd: 0.5, price: 1.18, note: "Triple-fan ROG cooler, highest factory clocks in the ASUS line" },
    { suffix: "TUF Gaming OC", power: 1.03, lenAdd: 12, slotAdd: 0, price: 1.09, note: "Military-grade component rating, quieter than the Strix under load" },
    { suffix: "ProArt", power: 1.0, lenAdd: 0, slotAdd: 0, price: 1.06, note: "Reference clocks, colour-accurate output tuning, slimmer shroud" },
  ],
  MSI: [
    { suffix: "SUPRIM X", power: 1.06, lenAdd: 25, slotAdd: 0.5, price: 1.19, note: "Brushed alloy shroud, MSI's top bin" },
    { suffix: "GAMING TRIO OC", power: 1.03, lenAdd: 15, slotAdd: 0, price: 1.1, note: "The volume seller — TRI FROZR cooler, mild factory OC" },
    { suffix: "VENTUS 3X", power: 1.0, lenAdd: 5, slotAdd: 0, price: 1.02, note: "Reference clocks, plainest cooler, cheapest entry to the die" },
  ],
  GIGABYTE: [
    { suffix: "AORUS MASTER", power: 1.06, lenAdd: 24, slotAdd: 0.5, price: 1.17, note: "AORUS bin with an LCD side panel and the largest heatsink" },
    { suffix: "GAMING OC", power: 1.03, lenAdd: 14, slotAdd: 0, price: 1.08, note: "WINDFORCE triple fan, alternate-spinning centre fan" },
    { suffix: "EAGLE", power: 1.0, lenAdd: 6, slotAdd: 0, price: 1.02, note: "Reference clocks, value shroud" },
  ],
  ZOTAC: [
    { suffix: "AMP Extreme AIRO", power: 1.05, lenAdd: 20, slotAdd: 0.5, price: 1.14, note: "ZOTAC's halo cooler, generous power limit headroom" },
    { suffix: "Trinity OC", power: 1.02, lenAdd: 8, slotAdd: 0, price: 1.05, note: "Compact triple-fan, fits smaller cases than most" },
    { suffix: "Twin Edge", power: 1.0, lenAdd: -20, slotAdd: -0.5, price: 1.0, note: "Two fans and a short PCB — the SFF answer" },
  ],
  Palit: [
    { suffix: "GameRock OC", power: 1.04, lenAdd: 18, slotAdd: 0.5, price: 1.11, note: "Crystal shroud, strong cooler for the money" },
    { suffix: "GamingPro", power: 1.0, lenAdd: 8, slotAdd: 0, price: 1.01, note: "Reference clocks, typically the cheapest card on the shelf" },
  ],
  Inno3D: [
    { suffix: "iCHILL X3", power: 1.04, lenAdd: 20, slotAdd: 0.5, price: 1.12, note: "iCHILL cooling, high sustained boost" },
    { suffix: "X3 OC", power: 1.01, lenAdd: 6, slotAdd: 0, price: 1.03, note: "Mild OC, unremarkable and reliable" },
  ],
  Colorful: [
    { suffix: "iGame Ultra W", power: 1.04, lenAdd: 18, slotAdd: 0.5, price: 1.1, note: "White shroud, one-key overclock button on the card" },
    { suffix: "Battle-Ax", power: 1.0, lenAdd: 4, slotAdd: 0, price: 1.0, note: "Value tier, widely imported into Pakistan" },
  ],
  PNY: [
    { suffix: "XLR8 VERTO OC", power: 1.03, lenAdd: 12, slotAdd: 0, price: 1.07, note: "PNY's gaming line" },
    { suffix: "VERTO", power: 1.0, lenAdd: 0, slotAdd: 0, price: 1.0, note: "Reference design and clocks" },
  ],
  Galax: [
    { suffix: "HOF OC Lab", power: 1.07, lenAdd: 26, slotAdd: 0.5, price: 1.22, note: "Hall of Fame bin — binned die, white PCB, extreme power limit" },
    { suffix: "EX Gamer", power: 1.01, lenAdd: 8, slotAdd: 0, price: 1.03, note: "Mainstream Galax card" },
  ],
  Sapphire: [
    { suffix: "NITRO+", power: 1.06, lenAdd: 22, slotAdd: 0.5, price: 1.16, note: "The best-regarded Radeon partner card, by a distance" },
    { suffix: "PULSE", power: 1.0, lenAdd: 6, slotAdd: 0, price: 1.02, note: "Reference clocks, excellent value" },
  ],
  PowerColor: [
    { suffix: "Red Devil", power: 1.06, lenAdd: 24, slotAdd: 0.5, price: 1.15, note: "Highest AMD partner power limits" },
    { suffix: "Hellhound", power: 1.03, lenAdd: 14, slotAdd: 0, price: 1.08, note: "Quiet triple-fan, tasteful" },
    { suffix: "Fighter", power: 1.0, lenAdd: 0, slotAdd: 0, price: 1.0, note: "Reference clocks, entry price" },
  ],
  XFX: [
    { suffix: "MERC 310 Black", power: 1.05, lenAdd: 20, slotAdd: 0.5, price: 1.13, note: "Heavy triple-slot cooler" },
    { suffix: "SWFT 210", power: 1.0, lenAdd: 4, slotAdd: 0, price: 1.01, note: "Dual fan, compact" },
  ],
  ASRock: [
    { suffix: "Taichi OC", power: 1.05, lenAdd: 20, slotAdd: 0.5, price: 1.12, note: "Cog-motif shroud, strong VRM" },
    { suffix: "Challenger", power: 1.0, lenAdd: 0, slotAdd: 0, price: 1.0, note: "Value tier" },
  ],
  // OEM channels for datacenter parts: identical silicon, different support path.
  NVIDIA: [{ suffix: "", power: 1, lenAdd: 0, slotAdd: 0, price: 1.0, note: "NVIDIA-branded reference board" }],
  Dell: [{ suffix: "(Dell OEM)", power: 1, lenAdd: 0, slotAdd: 0, price: 0.94, note: "Dell-branded, carries a Dell service tag; firmware is Dell-signed" }],
  HPE: [{ suffix: "(HPE OEM)", power: 1, lenAdd: 0, slotAdd: 0, price: 0.94, note: "HPE-branded, iLO-aware firmware" }],
  Supermicro: [{ suffix: "(Supermicro)", power: 1, lenAdd: 0, slotAdd: 0, price: 0.97, note: "Supermicro-validated, ships with the correct GPU tray brackets" }],
  Lenovo: [{ suffix: "(Lenovo OEM)", power: 1, lenAdd: 0, slotAdd: 0, price: 0.94, note: "Lenovo-branded, XClarity-aware" }],
  AMD: [{ suffix: "", power: 1, lenAdd: 0, slotAdd: 0, price: 1.0, note: "AMD reference board" }],
  Intel: [{ suffix: "", power: 1, lenAdd: 0, slotAdd: 0, price: 1.0, note: "Intel reference board" }],
  Leadtek: [{ suffix: "", power: 1, lenAdd: 0, slotAdd: 0, price: 0.98, note: "Leadtek-boxed, identical to reference" }],
  Gigabyte: [{ suffix: "(Gigabyte)", power: 1, lenAdd: 0, slotAdd: 0, price: 0.98, note: "Gigabyte-validated for their G-series servers" }],
};

const DEFAULT_TIER: Tier[] = [{ suffix: "", power: 1, lenAdd: 0, slotAdd: 0, price: 1, note: "Reference design" }];

/* ------------------------------------------------------------------- GPUs */

function expandGpus(): Gpu[] {
  const out: Gpu[] = [];
  for (const f of GPUS) {
    for (const partner of f.partners) {
      const tiers = TIERS[partner] ?? DEFAULT_TIER;
      for (const tier of tiers) {
        for (const cond of f.conditions) {
          // A halo-tier card almost never appears as a low-grade pull.
          if (tier.price > 1.15 && (cond === "pull" || cond === "refurb-b")) continue;

          const name = [f.name, tier.suffix].filter(Boolean).join(" ");
          const seed = `gpu:${f.key}:${partner}:${tier.suffix}:${cond}`;
          const id = `G-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
          const tdpW = Math.round(f.tdpW * tier.power);

          out.push({
            id,
            slug: slugify(`${partner}-${name}-${cond}-${id.slice(-4)}`),
            kind: "gpu",
            brand: partner === f.brand ? f.brand : partner,
            model: name,
            mpn: `${partner.slice(0, 3).toUpperCase()}-${f.key.toUpperCase()}-${fnv1a(seed).toString(36).slice(0, 5).toUpperCase()}`,
            condition: cond,
            segment: f.segment,
            family: f.key,
            searchKey: `${f.brand} ${f.name}`.replace(/\s+\d+GB\b/i, ""),
            price: money(f.usd * tier.price, cond, seed),
            avail: avail(seed, f.usd * tier.price, cond),
            warrantyMonths: COND_FACTOR[cond].warranty,
            releaseYear: f.year,
            highlights: [...f.highlights, tier.note].filter(Boolean),
            tags: [...f.tags, f.arch.toLowerCase().split(" ")[0], partner.toLowerCase()],
            arch: f.arch,
            vramGb: f.vramGb,
            vramType: f.vramType,
            memBusBits: f.busBits,
            memBandwidthGbs: f.bwGbs,
            fp32Tflops: Math.round(f.fp32 * tier.power * 10) / 10,
            bf16Tflops: Math.round(f.bf16 * tier.power),
            fp8Tflops: f.fp8 ? Math.round(f.fp8 * tier.power) : undefined,
            tdpW,
            formFactor: f.form,
            slotsWide: Math.max(1, f.slots + tier.slotAdd),
            lengthMm: Math.max(0, f.lenMm + (f.lenMm > 0 ? tier.lenAdd : 0)),
            pcieGen: f.pcieGen,
            pcieWidth: 16,
            connectors: f.conn,
            // Recommended PSU tracks actual board power, not the reference figure.
            psuRecW: f.psuW ? Math.ceil((f.psuW + (tdpW - f.tdpW) * 1.5) / 50) * 50 : 0,
            nvlink: f.nvlink,
            cooling: f.cooling,
            displayOutputs: f.outputs,
            eccVram: f.ecc,
            mig: f.mig,
            vgpuLicensable: f.vgpu,
          });
        }
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------- CPUs */

function expandCpus(): Cpu[] {
  const out: Cpu[] = [];
  for (const f of CPUS) {
    // Server chips sell as tray (bare) or boxed (with heatsink and warranty).
    const packs: Array<{ label: string; boxed: boolean; price: number }> = f.boxed
      ? [{ label: "Boxed", boxed: true, price: 1.0 }]
      : [
          { label: "Tray", boxed: false, price: 1.0 },
          { label: "Boxed", boxed: true, price: 1.06 },
        ];

    for (const pack of packs) {
      for (const cond of f.conditions) {
        if (pack.boxed && (cond === "pull" || cond === "refurb-b")) continue;
        const seed = `cpu:${f.key}:${pack.label}:${cond}`;
        const id = `C-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
        out.push({
          id,
          slug: slugify(`${f.brand}-${f.name}-${pack.label}-${cond}-${id.slice(-4)}`),
          kind: "cpu",
          brand: f.brand,
          model: `${f.name} ${pack.label}`,
          mpn: `${f.key.toUpperCase()}-${pack.label.slice(0, 3).toUpperCase()}`,
          condition: cond,
          segment: f.segment,
          family: f.key,
          searchKey: `${f.brand} ${f.name}`,
          price: money(f.usd * pack.price, cond, seed),
          avail: avail(seed, f.usd, cond),
          warrantyMonths: COND_FACTOR[cond].warranty,
          releaseYear: f.year,
          highlights: [
            ...f.highlights,
            pack.boxed ? "Boxed retail package, heatsink included" : "Tray part — no heatsink, order cooling separately",
          ],
          tags: [...f.tags, f.socket.toLowerCase(), f.brand.toLowerCase()],
          socket: f.socket,
          arch: f.arch,
          cores: f.cores,
          threads: f.threads,
          baseGhz: f.base,
          boostGhz: f.boost,
          l3Mb: f.l3,
          tdpW: f.tdpW,
          maxPowerW: f.maxW,
          memGen: f.memGen,
          memChannels: f.memCh,
          memKinds: f.memKinds,
          maxMemGb: f.maxMemGb,
          memMaxMts: f.memMts,
          eccSupport: f.ecc,
          pcieGen: f.pcieGen,
          pcieLanes: f.lanes,
          maxSockets: f.maxSockets,
          integratedGraphics: f.igpu,
          // Unlocked desktop parts (K/X/X3D) ship bare; locked ones include a
          // stock cooler. Server and HEDT parts never include one.
          coolerIncluded:
            pack.boxed && f.segment === "desktop" && !/(K|KF|KS|X|XT|X3D)$/.test(f.name),
          avx512: f.avx512,
          amx: f.amx,
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ motherboards */

function expandMobos(): Motherboard[] {
  const out: Motherboard[] = [];
  for (const f of MOBOS) {
    for (const cond of f.conditions) {
      const seed = `mb:${f.key}:${cond}`;
      const id = `M-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      out.push({
        id,
        slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`),
        kind: "motherboard",
        brand: f.brand,
        model: f.name,
        mpn: f.key.toUpperCase(),
        condition: cond,
        segment: f.segment,
        family: f.key,
        searchKey: `${f.brand} ${f.name}`,
        price: money(f.usd, cond, seed),
        avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty,
        releaseYear: f.year,
        highlights: f.highlights,
        tags: [...f.tags, f.socket.toLowerCase(), f.form],
        socket: f.socket,
        sockets: f.sockets,
        chipset: f.chipset,
        form: f.form,
        memGen: f.memGen,
        memSlots: f.memSlots,
        memKinds: f.memKinds,
        maxMemGb: f.maxMemGb,
        memMaxMts: f.memMts,
        eccSupport: f.ecc,
        pcieSlots: f.slots,
        m2Slots: f.m2,
        m2MaxGen: f.m2Gen,
        sataPorts: f.sata,
        u2Ports: f.u2,
        epsHeaders: f.eps,
        onboardNicGbps: f.nicGbps,
        onboardNicPorts: f.nicPorts,
        ipmi: f.ipmi,
        vrmPhases: f.vrm,
        biosFlashback: f.flashback,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ memory */

function expandMemory(): Memory[] {
  const out: Memory[] = [];
  for (const f of MEMORY) {
    for (const cap of f.caps) {
      for (const kitSize of f.kits) {
        for (const cond of f.conditions) {
          const totalGb = cap * kitSize;
          // Nobody sells a 24-module 16GB kit; keep the combinations sane.
          if (kitSize > 1 && totalGb > 3072) continue;
          if (kitSize >= 12 && cap < 32) continue;

          const seed = `mem:${f.key}:${cap}:${kitSize}:${cond}`;
          const id = `R-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
          const label = kitSize === 1 ? `${cap}GB Module` : `${totalGb}GB Kit (${kitSize}x${cap}GB)`;
          // Bigger modules cost more per GB — the density premium is real.
          const densityPremium = cap >= 128 ? 1.35 : cap >= 64 ? 1.12 : 1.0;

          out.push({
            id,
            slug: slugify(`${f.brand}-${f.name}-${totalGb}gb-${kitSize}x${cap}-${cond}-${id.slice(-4)}`),
            kind: "memory",
            brand: f.brand,
            model: `${f.name} ${label}`,
            mpn: `${f.key.toUpperCase()}-${cap}G-K${kitSize}`,
            condition: cond,
            segment: f.segment,
            family: f.key,
            searchKey: `${f.brand} ${f.name} ${cap}GB`,
            price: money(totalGb * f.usdPerGb * densityPremium, cond, seed),
            avail: avail(seed, totalGb * f.usdPerGb, cond),
            warrantyMonths: COND_FACTOR[cond].warranty,
            releaseYear: f.year,
            highlights: f.highlights,
            tags: [...f.tags, f.memGen, f.memKind],
            memGen: f.memGen,
            memKind: f.memKind,
            moduleGb: cap,
            modules: kitSize,
            mts: f.mts,
            casLatency: f.cl,
            ecc: f.ecc,
            ranks: f.ranks,
            voltage: f.volts,
            heightMm: f.heightMm,
            registered: f.registered,
          });
        }
      }
    }
  }
  return out;
}

/* ----------------------------------------------------------------- storage */

function expandStorage(): Storage[] {
  const out: Storage[] = [];
  for (const f of STORAGE) {
    for (const cap of f.caps) {
      for (const cond of f.conditions) {
        const seed = `st:${f.key}:${cap}:${cond}`;
        const id = `S-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
        const tb = cap / 1000;
        const label = cap >= 1000 ? `${(cap / 1000).toFixed(cap % 1000 ? 2 : 0)}TB` : `${cap}GB`;
        out.push({
          id,
          slug: slugify(`${f.brand}-${f.name}-${label}-${cond}-${id.slice(-4)}`),
          kind: "storage",
          brand: f.brand,
          model: `${f.name} ${label}`,
          mpn: `${f.key.toUpperCase()}-${cap}`,
          condition: cond,
          segment: f.segment,
          family: f.key,
          searchKey: `${f.brand} ${f.name} ${label}`,
          price: money(tb * f.usdPerTb, cond, seed),
          avail: avail(seed, tb * f.usdPerTb, cond),
          warrantyMonths: COND_FACTOR[cond].warranty,
          releaseYear: f.year,
          highlights: f.highlights,
          tags: [...f.tags, f.bus],
          bus: f.bus,
          capacityGb: cap,
          media: f.media,
          readMbs: f.readMbs,
          writeMbs: f.writeMbs,
          readIops: f.readIops,
          writeIops: f.writeIops,
          dwpd: f.dwpd,
          pcieGen: f.pcieGen,
          pcieWidth: f.pcieWidth,
          physical: f.physical,
          powerLossProtection: f.plp,
          tdpW: f.tdpW,
        });
      }
    }
  }
  return out;
}

/* --------------------------------------------------------------------- PSU */

function expandPsus(): Psu[] {
  const out: Psu[] = [];
  for (const f of PSUS) {
    for (const w of f.watts) {
      for (const cond of f.conditions) {
        const seed = `psu:${f.key}:${w}:${cond}`;
        const id = `P-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
        // Connector counts scale with wattage: a 650W unit has fewer GPU leads.
        const scale = w / Math.max(...f.watts);
        const connectors = Object.fromEntries(
          Object.entries(f.conn).map(([k, v]) => [k, Math.max(1, Math.round((v as number) * scale))])
        ) as Psu["connectors"];

        out.push({
          id,
          slug: slugify(`${f.brand}-${f.name}-${w}w-${cond}-${id.slice(-4)}`),
          kind: "psu",
          brand: f.brand,
          model: `${f.name} ${w}W`,
          mpn: `${f.key.toUpperCase()}-${w}`,
          condition: cond,
          segment: f.segment,
          family: f.key,
          searchKey: `${f.brand} ${f.name} ${w}W`,
          price: money((w / 1000) * f.usdPerKw, cond, seed),
          avail: avail(seed, (w / 1000) * f.usdPerKw, cond),
          warrantyMonths: COND_FACTOR[cond].warranty,
          releaseYear: f.year,
          highlights: f.highlights,
          tags: [...f.tags, f.form, f.eff.replace(/[^a-z]/g, "")],
          wattage: w,
          form: f.form,
          efficiency: f.eff,
          atxSpec: f.atx,
          modular: f.modular,
          connectors,
          redundancy: f.redundancy,
          inputVoltsMin: f.vMin,
          derated230V: f.derate230,
          depthMm: f.depthMm,
          fanless: false,
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------- simple one-to-N families */

function expandCoolers(): Cooler[] {
  return COOLERS.flatMap((f) =>
    f.conditions.map((cond): Cooler => {
      const seed = `cl:${f.key}:${cond}`;
      const id = `K-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "cooler",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: [...f.tags, f.type],
        type: f.type, sockets: f.sockets, tdpRatingW: f.tdpW, heightMm: f.heightMm,
        radiatorMm: f.radMm, needsChassisAirflow: f.needsAirflow, noiseDba: f.dba,
      };
    })
  );
}

function expandChassis(): Chassis[] {
  return CHASSIS.flatMap((f) =>
    f.conditions.map((cond): Chassis => {
      const seed = `ch:${f.key}:${cond}`;
      const id = `H-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "chassis",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: [...f.tags, f.form],
        form: f.form, rackU: f.rackU, moboForms: f.moboForms, psuForms: f.psuForms,
        maxGpuLengthMm: f.maxGpuMm, maxCoolerHeightMm: f.maxCoolerMm, maxRadiatorMm: f.maxRadMm,
        expansionSlots: f.slots, bays35: f.bays35, bays25: f.bays25, hotSwapBays: f.hotSwap,
        backplane: f.backplane, forcedAirflow: f.airflow, maxGpus: f.maxGpus,
        depthMm: f.depthMm, weightKg: f.kg,
      };
    })
  );
}

function expandNics(): Nic[] {
  return NICS.flatMap((f) =>
    f.conditions.map((cond): Nic => {
      const seed = `nic:${f.key}:${cond}`;
      const id = `N-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "nic",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: [...f.tags, f.portType],
        fabric: f.fabric, portGbps: f.gbps, ports: f.ports, portType: f.portType,
        pcieGen: f.pcieGen, pcieWidth: f.pcieWidth, tdpW: f.tdpW,
        rdma: f.rdma, sriov: f.sriov, gpuDirect: f.gpuDirect, lowProfile: f.lowProfile,
      };
    })
  );
}

function expandSwitches(): Switch[] {
  return SWITCHES.flatMap((f) =>
    f.conditions.map((cond): Switch => {
      const seed = `sw:${f.key}:${cond}`;
      const id = `W-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "switch",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: [...f.tags, f.portType],
        fabric: f.fabric, ports: f.ports, portGbps: f.gbps, portType: f.portType,
        rackU: f.rackU, switchingTbps: f.tbps, tdpW: f.tdpW, managed: f.managed,
        airflow: f.airflow, psuRedundant: f.psuRedundant,
      };
    })
  );
}

function expandOptics(): Optic[] {
  const out: Optic[] = [];
  for (const f of OPTICS) {
    for (const len of f.lengths) {
      for (const coded of f.codedFor) {
        const seed = `op:${f.key}:${len}:${coded}`;
        const id = `O-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
        const lenLabel = len > 0 ? `${len}m` : "Module";
        // Copper gets dearer per metre as it gets longer; optics do not.
        const lenPrice = f.media.startsWith("dac") ? 1 + len * 0.18 : f.media === "aoc" ? 1 + len * 0.035 : 1;
        out.push({
          id,
          slug: slugify(`${f.brand}-${f.name}-${lenLabel}-${coded}-${id.slice(-4)}`),
          kind: "optic",
          brand: f.brand,
          model: `${f.name} ${lenLabel} — ${coded} coded`,
          mpn: `${f.key.toUpperCase()}-${len}M-${coded.slice(0, 4).toUpperCase()}`,
          condition: "new",
          segment: f.segment,
          family: f.key,
          searchKey: `${f.brand} ${f.name} ${lenLabel}`,
          price: money(f.usd * lenPrice, "new", seed),
          avail: avail(seed, f.usd * lenPrice, "new"),
          warrantyMonths: 12,
          releaseYear: f.year,
          highlights: f.highlights,
          tags: [...f.tags, f.portType, slugify(coded)],
          media: f.media,
          portType: f.portType,
          gbps: f.gbps,
          lengthM: len,
          reachM: f.reachM,
          codedFor: coded,
          fabric: f.fabric,
          powerW: f.powerW,
        });
      }
    }
  }
  return out;
}

function expandRacks(): Rack[] {
  return RACKS.flatMap((f) =>
    f.conditions.map((cond): Rack => {
      const seed = `rk:${f.key}:${cond}`;
      const id = `A-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "rack",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: f.tags,
        heightU: f.heightU, widthMm: f.widthMm, depthMm: f.depthMm, staticLoadKg: f.loadKg,
        perforationPct: f.perfPct, includedPduSlots: f.pduSlots, shielded: f.shielded,
      };
    })
  );
}

function expandPdus(): Pdu[] {
  return PDUS.flatMap((f) =>
    f.conditions.map((cond): Pdu => {
      const seed = `pd:${f.key}:${cond}`;
      const id = `D-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "pdu",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: f.tags,
        outlets: f.outlets, outletType: f.outletType, phases: f.phases, inputAmps: f.amps,
        maxKw: f.kw, metered: f.metered, switched: f.switched, rackU: f.rackU, voltage: f.volts,
      };
    })
  );
}

function expandUpses(): Ups[] {
  return UPSES.flatMap((f) =>
    f.conditions.map((cond): Ups => {
      const seed = `up:${f.key}:${cond}`;
      const id = `U-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.brand}-${f.name}-${cond}-${id.slice(-4)}`), kind: "ups",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key, searchKey: `${f.brand} ${f.name}`, price: money(f.usd, cond, seed), avail: avail(seed, f.usd, cond),
        warrantyMonths: COND_FACTOR[cond].warranty, releaseYear: f.year,
        highlights: f.highlights, tags: f.tags,
        vaRating: f.va, wattage: f.watts, topology: f.topology, rackU: f.rackU,
        runtimeHalfLoadMin: f.runtimeMin, externalBatterySupport: f.extBattery,
        outlets: f.outlets, inputVolts: f.volts,
      };
    })
  );
}

function expandSystems(): System[] {
  return SYSTEMS.flatMap((f) =>
    f.conditions.map((cond): System => {
      const seed = `sy:${f.key}:${cond}`;
      const id = `T-${fnv1a(seed).toString(36).toUpperCase().padStart(7, "0")}`;
      return {
        id, slug: slugify(`${f.name}-${cond}-${id.slice(-4)}`), kind: "system",
        brand: f.brand, model: f.name, mpn: f.key.toUpperCase(), condition: cond, segment: f.segment,
        family: f.key,
        searchKey: `${f.cpuModel} ${f.gpuModel ?? ""} server`.trim(),
        price: { ...money(f.usd, cond, seed, "system"), onRequest: f.usd > 90000 },
        avail: { inHouse: 0, leadDays: f.usd > 90000 ? 60 : 30, indentOnly: true },
        warrantyMonths: cond === "new" ? 36 : 12, releaseYear: f.year,
        highlights: f.highlights, tags: [...f.tags, f.category],
        category: f.category, rackU: f.rackU, nodes: f.nodes, cpuModel: f.cpuModel,
        cpuSockets: f.cpuSockets, coresTotal: f.coresTotal, gpuModel: f.gpuModel,
        gpuCount: f.gpuCount, memGb: f.memGb, memGen: f.memGen, storageSummary: f.storage,
        fabricSummary: f.fabric, peakPowerW: f.peakW, bf16Tflops: f.bf16,
        softwareStack: f.stack, burnInHours: f.burnIn,
      };
    })
  );
}

/* ------------------------------------------------------------------ export */

let cache: Product[] | null = null;

/** The full SKU list. Built once per process, then reused. */
export function allProducts(): Product[] {
  if (cache) return cache;
  cache = [
    ...expandGpus(),
    ...expandCpus(),
    ...expandMobos(),
    ...expandMemory(),
    ...expandStorage(),
    ...expandPsus(),
    ...expandCoolers(),
    ...expandChassis(),
    ...expandNics(),
    ...expandSwitches(),
    ...expandOptics(),
    ...expandRacks(),
    ...expandPdus(),
    ...expandUpses(),
    ...expandSystems(),
  ];
  return cache;
}

export { rand, randInt, pick, fnv1a };
