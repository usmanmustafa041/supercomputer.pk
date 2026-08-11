/**
 * Product families — the hand-authored spec truth.
 *
 * One entry per real part. `expand.ts` multiplies these across condition
 * grades, board partners and capacity options to produce the shipping SKU
 * list. Specs are vendor figures: dense tensor throughput, not sparse; real
 * board power, not "typical graphics power" where the two differ.
 */

import type {
  Condition,
  MemGen,
  MemKind,
  MoboForm,
  PcieGen,
  PcieSlot,
  PcieWidth,
  PortType,
  PowerConnector,
  PsuForm,
  Segment,
  StorageBus,
  ChassisForm,
  Fabric,
} from "./types";

export interface FamilyBase {
  key: string;
  brand: string;
  name: string;
  segment: Segment;
  year: number;
  /** USD reference price. Landed PKR is derived in expand.ts. */
  usd: number;
  conditions: Condition[];
  highlights: string[];
  tags: string[];
}

/* ============================================================ GPU families */

export interface GpuFamily extends FamilyBase {
  arch: string;
  vramGb: number;
  vramType: "gddr6" | "gddr6x" | "gddr7" | "hbm2e" | "hbm3" | "hbm3e";
  busBits: number;
  bwGbs: number;
  fp32: number;
  bf16: number;
  fp8?: number;
  tdpW: number;
  form: "pcie" | "sxm" | "oam";
  slots: number;
  lenMm: number;
  pcieGen: PcieGen;
  conn: PowerConnector[];
  psuW: number;
  nvlink: boolean;
  cooling: "axial" | "blower" | "passive" | "liquid";
  outputs: number;
  ecc: boolean;
  mig: boolean;
  vgpu: boolean;
  /** Board partners that ship this die. Empty = reference/OEM only. */
  partners: string[];
}

const DC_COND: Condition[] = ["new", "refurb-a", "refurb-b", "recertified", "pull"];
const RETAIL_COND: Condition[] = ["new", "refurb-a", "refurb-b", "open-box"];
const LEGACY_COND: Condition[] = ["refurb-a", "refurb-b", "recertified", "pull"];

const NV_PARTNERS = ["ASUS", "MSI", "GIGABYTE", "ZOTAC", "Palit", "Inno3D", "Colorful", "PNY", "Galax"];
const AMD_PARTNERS = ["Sapphire", "PowerColor", "XFX", "ASRock", "GIGABYTE", "ASUS"];
const OEM_PARTNERS = ["NVIDIA", "Dell", "HPE", "Supermicro", "Lenovo"];

export const GPUS: GpuFamily[] = [
  // ---------------------------------------------------------- datacenter
  {
    key: "b200-sxm", brand: "NVIDIA", name: "B200 SXM6 180GB", segment: "datacenter", year: 2025, usd: 38000,
    arch: "Blackwell", vramGb: 180, vramType: "hbm3e", busBits: 8192, bwGbs: 8000,
    fp32: 80, bf16: 2250, fp8: 4500, tdpW: 1000, form: "sxm", slots: 0, lenMm: 0, pcieGen: 5,
    conn: [], psuW: 0, nvlink: true, cooling: "liquid", outputs: 0, ecc: true, mig: true, vgpu: false,
    partners: OEM_PARTNERS, conditions: ["new"],
    highlights: ["Ships only as part of an HGX B200 8-GPU baseboard", "1.8 TB/s NVLink 5 per GPU", "Requires direct-to-chip liquid or 10U air"],
    tags: ["hgx", "nvlink", "liquid", "training", "flagship"],
  },
  {
    key: "h200-sxm", brand: "NVIDIA", name: "H200 SXM5 141GB", segment: "datacenter", year: 2024, usd: 31000,
    arch: "Hopper", vramGb: 141, vramType: "hbm3e", busBits: 6144, bwGbs: 4800,
    fp32: 67, bf16: 989, fp8: 1979, tdpW: 700, form: "sxm", slots: 0, lenMm: 0, pcieGen: 5,
    conn: [], psuW: 0, nvlink: true, cooling: "liquid", outputs: 0, ecc: true, mig: true, vgpu: false,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a"],
    highlights: ["141GB HBM3e — fits Llama-3 70B in BF16 on a single GPU", "900 GB/s NVLink 4", "HGX baseboard only, no PCIe variant"],
    tags: ["hgx", "nvlink", "training", "inference", "large-memory"],
  },
  {
    key: "h200-nvl", brand: "NVIDIA", name: "H200 NVL 141GB", segment: "datacenter", year: 2024, usd: 30000,
    arch: "Hopper", vramGb: 141, vramType: "hbm3e", busBits: 6144, bwGbs: 4800,
    fp32: 60, bf16: 835, fp8: 1671, tdpW: 600, form: "pcie", slots: 2, lenMm: 268, pcieGen: 5,
    conn: ["12v2x6"], psuW: 1600, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a"],
    highlights: ["Dual-slot PCIe card, 4-way NVLink bridge", "Drops into a standard 4U GPU server", "Requires front-to-back forced airflow"],
    tags: ["nvlink", "passive", "inference", "large-memory"],
  },
  {
    key: "h100-sxm", brand: "NVIDIA", name: "H100 SXM5 80GB", segment: "datacenter", year: 2022, usd: 27000,
    arch: "Hopper", vramGb: 80, vramType: "hbm3", busBits: 5120, bwGbs: 3350,
    fp32: 67, bf16: 989, fp8: 1979, tdpW: 700, form: "sxm", slots: 0, lenMm: 0, pcieGen: 5,
    conn: [], psuW: 0, nvlink: true, cooling: "liquid", outputs: 0, ecc: true, mig: true, vgpu: false,
    partners: OEM_PARTNERS, conditions: DC_COND,
    highlights: ["The training workhorse — 8-GPU HGX baseboard", "900 GB/s NVLink 4 all-to-all", "Transformer Engine with FP8"],
    tags: ["hgx", "nvlink", "training", "flagship"],
  },
  {
    key: "h100-pcie", brand: "NVIDIA", name: "H100 PCIe 80GB", segment: "datacenter", year: 2022, usd: 23000,
    arch: "Hopper", vramGb: 80, vramType: "hbm2e", busBits: 5120, bwGbs: 2000,
    fp32: 51, bf16: 756, fp8: 1513, tdpW: 350, form: "pcie", slots: 2, lenMm: 268, pcieGen: 5,
    conn: ["12vhpwr"], psuW: 1000, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: DC_COND,
    highlights: ["350W dual-slot passive — the practical retrofit for existing 4U servers", "NVLink bridge for 2-way pairing", "7-way MIG partitioning"],
    tags: ["nvlink", "passive", "training", "inference", "mig"],
  },
  {
    key: "h100-nvl", brand: "NVIDIA", name: "H100 NVL 94GB", segment: "datacenter", year: 2023, usd: 28000,
    arch: "Hopper", vramGb: 94, vramType: "hbm3", busBits: 6016, bwGbs: 3900,
    fp32: 60, bf16: 835, fp8: 1671, tdpW: 400, form: "pcie", slots: 2, lenMm: 268, pcieGen: 5,
    conn: ["12vhpwr"], psuW: 1200, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a", "recertified"],
    highlights: ["Sold as bridged pairs — 188GB across two cards", "3.9 TB/s per card", "Built for 70B-class LLM inference"],
    tags: ["nvlink", "passive", "inference", "large-memory"],
  },
  {
    key: "a100-sxm-80", brand: "NVIDIA", name: "A100 SXM4 80GB", segment: "datacenter", year: 2020, usd: 11000,
    arch: "Ampere", vramGb: 80, vramType: "hbm2e", busBits: 5120, bwGbs: 2039,
    fp32: 19.5, bf16: 312, tdpW: 400, form: "sxm", slots: 0, lenMm: 0, pcieGen: 4,
    conn: [], psuW: 0, nvlink: true, cooling: "liquid", outputs: 0, ecc: true, mig: true, vgpu: false,
    partners: OEM_PARTNERS, conditions: DC_COND,
    highlights: ["Still the best PKR-per-training-hour on the refurb market", "600 GB/s NVLink 3", "Mature CUDA support, zero driver drama"],
    tags: ["hgx", "nvlink", "training", "value"],
  },
  {
    key: "a100-pcie-80", brand: "NVIDIA", name: "A100 PCIe 80GB", segment: "datacenter", year: 2021, usd: 9200,
    arch: "Ampere", vramGb: 80, vramType: "hbm2e", busBits: 5120, bwGbs: 1935,
    fp32: 19.5, bf16: 312, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 900, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: DC_COND,
    highlights: ["Uses an EPS-8 (CPU-style) power lead, not PCIe 8-pin", "300W passive, fits most 2U/4U GPU chassis", "7-way MIG"],
    tags: ["nvlink", "passive", "training", "mig", "value"],
  },
  {
    key: "a100-pcie-40", brand: "NVIDIA", name: "A100 PCIe 40GB", segment: "datacenter", year: 2020, usd: 6400,
    arch: "Ampere", vramGb: 40, vramType: "hbm2e", busBits: 5120, bwGbs: 1555,
    fp32: 19.5, bf16: 312, tdpW: 250, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 850, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: LEGACY_COND,
    highlights: ["Entry into real HBM training on a Pakistani budget", "Same compute as the 80GB, half the memory", "Widely available as a tested pull"],
    tags: ["nvlink", "passive", "training", "value", "budget"],
  },
  {
    key: "l40s", brand: "NVIDIA", name: "L40S 48GB", segment: "datacenter", year: 2023, usd: 9000,
    arch: "Ada Lovelace", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 864,
    fp32: 91.6, bf16: 362, fp8: 733, tdpW: 350, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["12vhpwr"], psuW: 1000, nvlink: false, cooling: "passive", outputs: 0, ecc: true, mig: false, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a", "recertified"],
    highlights: ["Best all-rounder: inference, rendering and video transcode on one card", "No NVLink — scale out over the fabric instead", "GDDR6 with ECC, far cheaper per GB than HBM"],
    tags: ["passive", "inference", "render", "vgpu"],
  },
  {
    key: "l40", brand: "NVIDIA", name: "L40 48GB", segment: "datacenter", year: 2022, usd: 7400,
    arch: "Ada Lovelace", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 864,
    fp32: 90.5, bf16: 181, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["12vhpwr"], psuW: 900, nvlink: false, cooling: "passive", outputs: 4, ecc: true, mig: false, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a", "refurb-b", "recertified"],
    highlights: ["Graphics-first sibling of the L40S with display outputs", "Strong choice for VDI and virtual workstations", "300W fits older 2U thermal budgets"],
    tags: ["passive", "vgpu", "render", "vdi"],
  },
  {
    key: "l4", brand: "NVIDIA", name: "L4 24GB", segment: "datacenter", year: 2023, usd: 2400,
    arch: "Ada Lovelace", vramGb: 24, vramType: "gddr6", busBits: 192, bwGbs: 300,
    fp32: 30.3, bf16: 121, fp8: 242, tdpW: 72, form: "pcie", slots: 1, lenMm: 169, pcieGen: 4,
    conn: [], psuW: 500, nvlink: false, cooling: "passive", outputs: 0, ecc: true, mig: false, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new", "refurb-a", "recertified"],
    highlights: ["72W off the slot alone — no auxiliary power cable", "Single-slot low-profile, fits 1U", "Eight per node is routine"],
    tags: ["passive", "low-profile", "inference", "efficient", "1u"],
  },
  {
    key: "a30", brand: "NVIDIA", name: "A30 24GB", segment: "datacenter", year: 2021, usd: 3600,
    arch: "Ampere", vramGb: 24, vramType: "hbm2e", busBits: 3072, bwGbs: 933,
    fp32: 10.3, bf16: 165, tdpW: 165, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 700, nvlink: true, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: LEGACY_COND,
    highlights: ["HBM2e bandwidth at a fraction of A100 pricing", "4-way MIG for multi-tenant inference", "165W is easy to cool"],
    tags: ["passive", "inference", "mig", "value"],
  },
  {
    key: "a40", brand: "NVIDIA", name: "A40 48GB", segment: "datacenter", year: 2020, usd: 4400,
    arch: "Ampere", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 696,
    fp32: 37.4, bf16: 149, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 900, nvlink: true, cooling: "passive", outputs: 3, ecc: true, mig: false, vgpu: true,
    partners: OEM_PARTNERS, conditions: LEGACY_COND,
    highlights: ["48GB ECC for under half the price of an L40", "NVLink bridge to 96GB across a pair", "Common tested pull from render farms"],
    tags: ["passive", "nvlink", "render", "vgpu", "value"],
  },
  {
    key: "rtx-pro-6000-server", brand: "NVIDIA", name: "RTX PRO 6000 Blackwell Server Edition 96GB", segment: "datacenter", year: 2025, usd: 9500,
    arch: "Blackwell", vramGb: 96, vramType: "gddr7", busBits: 512, bwGbs: 1792,
    fp32: 125, bf16: 503, fp8: 1007, tdpW: 600, form: "pcie", slots: 2, lenMm: 268, pcieGen: 5,
    conn: ["12v2x6"], psuW: 1600, nvlink: false, cooling: "passive", outputs: 0, ecc: true, mig: true, vgpu: true,
    partners: OEM_PARTNERS, conditions: ["new"],
    highlights: ["96GB GDDR7 with ECC — H100-class capacity without HBM pricing", "600W passive needs a genuinely well-ventilated 4U", "MIG and vGPU both supported"],
    tags: ["passive", "inference", "large-memory", "mig", "vgpu"],
  },
  {
    key: "mi300x", brand: "AMD", name: "Instinct MI300X 192GB", segment: "datacenter", year: 2023, usd: 15000,
    arch: "CDNA 3", vramGb: 192, vramType: "hbm3", busBits: 8192, bwGbs: 5300,
    fp32: 163.4, bf16: 1307, fp8: 2615, tdpW: 750, form: "oam", slots: 0, lenMm: 0, pcieGen: 5,
    conn: [], psuW: 0, nvlink: false, cooling: "liquid", outputs: 0, ecc: true, mig: false, vgpu: false,
    partners: ["AMD", "Supermicro", "Dell", "Gigabyte"], conditions: ["new"],
    highlights: ["192GB HBM3 — the most memory per accelerator you can buy in volume", "OAM module on an 8-way UBB baseboard", "ROCm 6, not CUDA — budget porting time"],
    tags: ["oam", "training", "large-memory", "rocm"],
  },
  {
    key: "mi210", brand: "AMD", name: "Instinct MI210 64GB", segment: "datacenter", year: 2022, usd: 5500,
    arch: "CDNA 2", vramGb: 64, vramType: "hbm2e", busBits: 4096, bwGbs: 1638,
    fp32: 22.6, bf16: 181, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 900, nvlink: false, cooling: "passive", outputs: 0, ecc: true, mig: false, vgpu: false,
    partners: ["AMD", "Dell", "HPE"], conditions: ["new", "refurb-a", "pull"],
    highlights: ["64GB HBM2e in a standard dual-slot PCIe card", "Infinity Fabric bridge for 2- and 4-way", "Excellent FP64 for classical HPC"],
    tags: ["passive", "hpc", "fp64", "rocm", "value"],
  },
  {
    key: "gaudi3", brand: "Intel", name: "Gaudi 3 HL-325L 128GB", segment: "datacenter", year: 2024, usd: 16000,
    arch: "Gaudi 3", vramGb: 128, vramType: "hbm2e", busBits: 8192, bwGbs: 3700,
    fp32: 60, bf16: 1835, fp8: 1835, tdpW: 900, form: "oam", slots: 0, lenMm: 0, pcieGen: 5,
    conn: [], psuW: 0, nvlink: false, cooling: "liquid", outputs: 0, ecc: true, mig: false, vgpu: false,
    partners: ["Intel", "Supermicro"], conditions: ["new"],
    highlights: ["24x 200GbE RoCE integrated on-package — no separate NICs", "Scales over standard Ethernet rather than proprietary fabric", "SynapseAI stack with PyTorch bridge"],
    tags: ["oam", "training", "ethernet-scale"],
  },

  // --------------------------------------------------------- workstation
  {
    key: "rtx-pro-6000-ws", brand: "NVIDIA", name: "RTX PRO 6000 Blackwell Workstation 96GB", segment: "workstation", year: 2025, usd: 8600,
    arch: "Blackwell", vramGb: 96, vramType: "gddr7", busBits: 512, bwGbs: 1792,
    fp32: 125, bf16: 503, fp8: 1007, tdpW: 600, form: "pcie", slots: 2, lenMm: 304, pcieGen: 5,
    conn: ["12v2x6"], psuW: 1000, nvlink: false, cooling: "axial", outputs: 4, ecc: true, mig: true, vgpu: false,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: ["new"],
    highlights: ["96GB ECC GDDR7 in a workstation you can put under a desk", "600W on a single 12V-2x6 — check your PSU spec revision", "Four DisplayPort 2.1b outputs"],
    tags: ["ecc", "large-memory", "render", "flagship"],
  },
  {
    key: "rtx-6000-ada", brand: "NVIDIA", name: "RTX 6000 Ada Generation 48GB", segment: "workstation", year: 2022, usd: 6800,
    arch: "Ada Lovelace", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 960,
    fp32: 91.1, bf16: 364, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["12vhpwr"], psuW: 850, nvlink: false, cooling: "axial", outputs: 4, ecc: true, mig: false, vgpu: false,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: RETAIL_COND,
    highlights: ["48GB ECC at 300W — two fit comfortably in one tower", "The default choice for CAD, simulation and mid-size model training", "Blower-style axial, exhausts out the back"],
    tags: ["ecc", "render", "cad", "large-memory"],
  },
  {
    key: "rtx-5000-ada", brand: "NVIDIA", name: "RTX 5000 Ada Generation 32GB", segment: "workstation", year: 2023, usd: 4000,
    arch: "Ada Lovelace", vramGb: 32, vramType: "gddr6", busBits: 256, bwGbs: 576,
    fp32: 65.3, bf16: 261, tdpW: 250, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["12vhpwr"], psuW: 750, nvlink: false, cooling: "axial", outputs: 4, ecc: true, mig: false, vgpu: false,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: RETAIL_COND,
    highlights: ["32GB ECC — the sweet spot for Stable Diffusion and mid-size CFD", "250W keeps a dual-card build under 1000W", "Full DisplayPort 2.1 output set"],
    tags: ["ecc", "render", "cad"],
  },
  {
    key: "rtx-4000-ada", brand: "NVIDIA", name: "RTX 4000 Ada Generation 20GB", segment: "workstation", year: 2023, usd: 1450,
    arch: "Ada Lovelace", vramGb: 20, vramType: "gddr6", busBits: 160, bwGbs: 360,
    fp32: 26.7, bf16: 107, tdpW: 130, form: "pcie", slots: 1, lenMm: 241, pcieGen: 4,
    conn: ["pcie-8"], psuW: 550, nvlink: false, cooling: "blower", outputs: 4, ecc: true, mig: false, vgpu: false,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: RETAIL_COND,
    highlights: ["Single slot, 130W, 20GB ECC — four fit in one workstation", "Blower exhaust keeps a dense build thermally sane", "The quiet answer to multi-GPU on a desk"],
    tags: ["ecc", "single-slot", "dense", "efficient"],
  },
  {
    key: "rtx-a6000", brand: "NVIDIA", name: "RTX A6000 48GB", segment: "workstation", year: 2020, usd: 3400,
    arch: "Ampere", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 768,
    fp32: 38.7, bf16: 155, tdpW: 300, form: "pcie", slots: 2, lenMm: 267, pcieGen: 4,
    conn: ["eps-8"], psuW: 850, nvlink: true, cooling: "blower", outputs: 4, ecc: true, mig: false, vgpu: true,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: LEGACY_COND,
    highlights: ["48GB ECC with a working NVLink bridge — 96GB across a pair", "Heavily available refurbished from render and VFX houses", "Blower cooling, genuinely stackable"],
    tags: ["ecc", "nvlink", "render", "value", "large-memory"],
  },
  {
    key: "rtx-a4000", brand: "NVIDIA", name: "RTX A4000 16GB", segment: "workstation", year: 2021, usd: 900,
    arch: "Ampere", vramGb: 16, vramType: "gddr6", busBits: 256, bwGbs: 448,
    fp32: 19.2, bf16: 77, tdpW: 140, form: "pcie", slots: 1, lenMm: 241, pcieGen: 4,
    conn: ["pcie-8"], psuW: 500, nvlink: false, cooling: "blower", outputs: 4, ecc: true, mig: false, vgpu: false,
    partners: ["NVIDIA", "PNY", "Leadtek"], conditions: LEGACY_COND,
    highlights: ["Single-slot 16GB ECC at 140W", "The cheapest route to a quiet 4-GPU inference box", "Extremely common on the Pakistani refurb market"],
    tags: ["ecc", "single-slot", "dense", "value", "budget"],
  },
  {
    key: "w7900", brand: "AMD", name: "Radeon PRO W7900 48GB", segment: "workstation", year: 2023, usd: 3500,
    arch: "RDNA 3", vramGb: 48, vramType: "gddr6", busBits: 384, bwGbs: 864,
    fp32: 61.3, bf16: 122, tdpW: 295, form: "pcie", slots: 3, lenMm: 287, pcieGen: 4,
    conn: ["pcie-8", "pcie-8"], psuW: 800, nvlink: false, cooling: "blower", outputs: 4, ecc: true, mig: false, vgpu: false,
    partners: ["AMD", "Sapphire"], conditions: ["new", "refurb-a", "open-box"],
    highlights: ["48GB ECC at a real discount to the NVIDIA equivalent", "Triple-slot — check your slot spacing before ordering two", "ROCm on Linux, solid OpenCL and Vulkan"],
    tags: ["ecc", "render", "rocm", "large-memory"],
  },

  // ------------------------------------------------------------- desktop
  {
    key: "rtx-5090", brand: "NVIDIA", name: "GeForce RTX 5090 32GB", segment: "desktop", year: 2025, usd: 2000,
    arch: "Blackwell", vramGb: 32, vramType: "gddr7", busBits: 512, bwGbs: 1792,
    fp32: 104.8, bf16: 209, tdpW: 575, form: "pcie", slots: 3, lenMm: 304, pcieGen: 5,
    conn: ["12v2x6"], psuW: 1000, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: NV_PARTNERS, conditions: ["new", "open-box", "refurb-a"],
    highlights: ["32GB GDDR7 — the most VRAM on any consumer card", "575W board power; use a native 12V-2x6 cable, never an adapter", "Genuinely viable for local 30B-class inference"],
    tags: ["flagship", "gaming", "local-llm", "high-power"],
  },
  {
    key: "rtx-5080", brand: "NVIDIA", name: "GeForce RTX 5080 16GB", segment: "desktop", year: 2025, usd: 1000,
    arch: "Blackwell", vramGb: 16, vramType: "gddr7", busBits: 256, bwGbs: 960,
    fp32: 56.3, bf16: 113, tdpW: 360, form: "pcie", slots: 3, lenMm: 304, pcieGen: 5,
    conn: ["12v2x6"], psuW: 850, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: NV_PARTNERS, conditions: ["new", "open-box", "refurb-a"],
    highlights: ["960 GB/s on a 256-bit bus", "360W, comfortable on a good 850W unit", "DLSS 4 with multi-frame generation"],
    tags: ["gaming", "creator"],
  },
  {
    key: "rtx-5070ti", brand: "NVIDIA", name: "GeForce RTX 5070 Ti 16GB", segment: "desktop", year: 2025, usd: 750,
    arch: "Blackwell", vramGb: 16, vramType: "gddr7", busBits: 256, bwGbs: 896,
    fp32: 43.9, bf16: 88, tdpW: 300, form: "pcie", slots: 3, lenMm: 300, pcieGen: 5,
    conn: ["12v2x6"], psuW: 750, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: NV_PARTNERS, conditions: ["new", "open-box", "refurb-a"],
    highlights: ["16GB at 300W — the value pick for 1440p and light ML", "Same 256-bit GDDR7 bus as the 5080", "Fits most mid-towers at 300mm"],
    tags: ["gaming", "value", "creator"],
  },
  {
    key: "rtx-4090", brand: "NVIDIA", name: "GeForce RTX 4090 24GB", segment: "desktop", year: 2022, usd: 1750,
    arch: "Ada Lovelace", vramGb: 24, vramType: "gddr6x", busBits: 384, bwGbs: 1008,
    fp32: 82.6, bf16: 165, tdpW: 450, form: "pcie", slots: 3, lenMm: 336, pcieGen: 4,
    conn: ["12vhpwr"], psuW: 850, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: NV_PARTNERS, conditions: ["new", "refurb-a", "refurb-b", "open-box"],
    highlights: ["24GB still holds its value for local model work", "336mm reference length — measure your case", "Inspect the 12VHPWR connector on any used unit before buying"],
    tags: ["gaming", "local-llm", "creator", "high-power"],
  },
  {
    key: "rtx-3090", brand: "NVIDIA", name: "GeForce RTX 3090 24GB", segment: "desktop", year: 2020, usd: 800,
    arch: "Ampere", vramGb: 24, vramType: "gddr6x", busBits: 384, bwGbs: 936,
    fp32: 35.6, bf16: 71, tdpW: 350, form: "pcie", slots: 3, lenMm: 313, pcieGen: 4,
    conn: ["pcie-8", "pcie-8"], psuW: 750, nvlink: true, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: NV_PARTNERS, conditions: LEGACY_COND,
    highlights: ["24GB and a working NVLink bridge — the classic budget 48GB pair", "Standard PCIe 8-pins, no 12VHPWR risk", "Re-paste any used unit; the GDDR6X backplane runs hot"],
    tags: ["nvlink", "local-llm", "value", "budget"],
  },
  {
    key: "rx-7900xtx", brand: "AMD", name: "Radeon RX 7900 XTX 24GB", segment: "desktop", year: 2022, usd: 900,
    arch: "RDNA 3", vramGb: 24, vramType: "gddr6", busBits: 384, bwGbs: 960,
    fp32: 61.4, bf16: 123, tdpW: 355, form: "pcie", slots: 3, lenMm: 287, pcieGen: 4,
    conn: ["pcie-8", "pcie-8"], psuW: 800, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: AMD_PARTNERS, conditions: ["new", "refurb-a", "open-box"],
    highlights: ["24GB for well under NVIDIA money", "ROCm on Linux is usable now, but check your framework first", "Two standard 8-pins"],
    tags: ["gaming", "value", "rocm"],
  },
  {
    key: "rx-9070xt", brand: "AMD", name: "Radeon RX 9070 XT 16GB", segment: "desktop", year: 2025, usd: 600,
    arch: "RDNA 4", vramGb: 16, vramType: "gddr6", busBits: 256, bwGbs: 645,
    fp32: 48.7, bf16: 97, tdpW: 304, form: "pcie", slots: 2, lenMm: 280, pcieGen: 5,
    conn: ["pcie-8", "pcie-8"], psuW: 750, nvlink: false, cooling: "axial", outputs: 4, ecc: false, mig: false, vgpu: false,
    partners: AMD_PARTNERS, conditions: ["new", "open-box"],
    highlights: ["Strong raster per rupee at 1440p", "FSR 4 with machine-learning upscaling", "Dual-slot at 280mm — fits far more cases than the 7900 XTX"],
    tags: ["gaming", "value"],
  },
];

/* ============================================================ CPU families */

export interface CpuFamily extends FamilyBase {
  socket: string;
  arch: string;
  cores: number;
  threads: number;
  base: number;
  boost: number;
  l3: number;
  tdpW: number;
  maxW: number;
  memGen: MemGen;
  memCh: number;
  memKinds: MemKind[];
  maxMemGb: number;
  memMts: number;
  ecc: boolean;
  pcieGen: PcieGen;
  lanes: number;
  maxSockets: number;
  igpu: boolean;
  boxed: boolean;
  avx512: boolean;
  amx: boolean;
}

export const CPUS: CpuFamily[] = [
  // ------------------------------------------------- AMD EPYC (server)
  { key: "epyc-9755", brand: "AMD", name: "EPYC 9755", segment: "datacenter", year: 2024, usd: 12984, socket: "SP5", arch: "Zen 5 (Turin)", cores: 128, threads: 256, base: 2.7, boost: 4.1, l3: 512, tdpW: 500, maxW: 500, memGen: "ddr5", memCh: 12, memKinds: ["rdimm"], maxMemGb: 6144, memMts: 6000, ecc: true, pcieGen: 5, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: false, conditions: ["new"], highlights: ["128 Zen 5 cores, 512MB L3", "12-channel DDR5-6000", "500W — liquid or a serious 2U heatsink"], tags: ["flagship", "dense", "hpc"] },
  { key: "epyc-9654", brand: "AMD", name: "EPYC 9654", segment: "datacenter", year: 2022, usd: 11805, socket: "SP5", arch: "Zen 4 (Genoa)", cores: 96, threads: 192, base: 2.4, boost: 3.7, l3: 384, tdpW: 360, maxW: 400, memGen: "ddr5", memCh: 12, memKinds: ["rdimm"], maxMemGb: 6144, memMts: 4800, ecc: true, pcieGen: 5, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: false, conditions: ["new", "refurb-a", "recertified", "pull"], highlights: ["96 cores at a price the refurb market has softened considerably", "12-channel DDR5 — populate all twelve or lose a third of your bandwidth", "128 PCIe 5.0 lanes"], tags: ["dense", "hpc", "value"] },
  { key: "epyc-9354", brand: "AMD", name: "EPYC 9354", segment: "datacenter", year: 2022, usd: 3400, socket: "SP5", arch: "Zen 4 (Genoa)", cores: 32, threads: 64, base: 3.25, boost: 3.8, l3: 256, tdpW: 280, maxW: 320, memGen: "ddr5", memCh: 12, memKinds: ["rdimm"], maxMemGb: 6144, memMts: 4800, ecc: true, pcieGen: 5, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: false, conditions: ["new", "refurb-a", "pull"], highlights: ["32 cores with the full 128-lane PCIe complement", "The right CPU under an 8-GPU box — lanes matter more than cores", "256MB L3"], tags: ["gpu-host", "balanced"] },
  { key: "epyc-7763", brand: "AMD", name: "EPYC 7763", segment: "datacenter", year: 2021, usd: 2900, socket: "SP3", arch: "Zen 3 (Milan)", cores: 64, threads: 128, base: 2.45, boost: 3.5, l3: 256, tdpW: 280, maxW: 280, memGen: "ddr4", memCh: 8, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4096, memMts: 3200, ecc: true, pcieGen: 4, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: false, amx: false, conditions: LEGACY_COND, highlights: ["64 Zen 3 cores for roughly the price of a mid-range desktop chip today", "128 PCIe 4.0 lanes", "DDR4 keeps the whole platform cheap"], tags: ["value", "hpc", "dense"] },
  { key: "epyc-7543", brand: "AMD", name: "EPYC 7543", segment: "datacenter", year: 2021, usd: 1400, socket: "SP3", arch: "Zen 3 (Milan)", cores: 32, threads: 64, base: 2.8, boost: 3.7, l3: 256, tdpW: 225, maxW: 240, memGen: "ddr4", memCh: 8, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4096, memMts: 3200, ecc: true, pcieGen: 4, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: false, amx: false, conditions: LEGACY_COND, highlights: ["Best value-per-lane on the used market right now", "225W is easy to cool in 2U", "Pairs well with four PCIe 4.0 GPUs"], tags: ["value", "gpu-host", "budget"] },
  { key: "epyc-7742", brand: "AMD", name: "EPYC 7742", segment: "datacenter", year: 2019, usd: 950, socket: "SP3", arch: "Zen 2 (Rome)", cores: 64, threads: 128, base: 2.25, boost: 3.4, l3: 256, tdpW: 225, maxW: 240, memGen: "ddr4", memCh: 8, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4096, memMts: 3200, ecc: true, pcieGen: 4, lanes: 128, maxSockets: 2, igpu: false, boxed: false, avx512: false, amx: false, conditions: LEGACY_COND, highlights: ["64 cores for entry-level money as a tested pull", "Rome is slower per-clock than Milan but the core count is free", "Check the board supports Rome without a BIOS update"], tags: ["value", "budget", "dense"] },

  // ------------------------------------------------ Intel Xeon (server)
  { key: "xeon-8592", brand: "Intel", name: "Xeon Platinum 8592+", segment: "datacenter", year: 2023, usd: 11600, socket: "LGA4677", arch: "Emerald Rapids", cores: 64, threads: 128, base: 1.9, boost: 3.9, l3: 320, tdpW: 350, maxW: 420, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 4096, memMts: 5600, ecc: true, pcieGen: 5, lanes: 80, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: true, conditions: ["new", "refurb-a"], highlights: ["AMX gives a real speedup on INT8/BF16 CPU inference", "320MB L3", "80 PCIe 5.0 lanes — fewer than EPYC, plan your risers"], tags: ["amx", "inference", "flagship"] },
  { key: "xeon-8480", brand: "Intel", name: "Xeon Platinum 8480+", segment: "datacenter", year: 2023, usd: 10700, socket: "LGA4677", arch: "Sapphire Rapids", cores: 56, threads: 112, base: 2.0, boost: 3.8, l3: 105, tdpW: 350, maxW: 420, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 4096, memMts: 4800, ecc: true, pcieGen: 5, lanes: 80, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: true, conditions: ["new", "refurb-a", "recertified", "pull"], highlights: ["First Xeon generation with AMX", "Prices have fallen hard on the secondary market", "CXL 1.1 memory expansion"], tags: ["amx", "value", "hpc"] },
  { key: "xeon-6430", brand: "Intel", name: "Xeon Gold 6430", segment: "datacenter", year: 2023, usd: 2130, socket: "LGA4677", arch: "Sapphire Rapids", cores: 32, threads: 64, base: 2.1, boost: 3.4, l3: 60, tdpW: 270, maxW: 320, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 4096, memMts: 4800, ecc: true, pcieGen: 5, lanes: 80, maxSockets: 2, igpu: false, boxed: false, avx512: true, amx: true, conditions: ["new", "refurb-a", "pull"], highlights: ["32 cores with AMX at a sane price", "The practical GPU-host Xeon", "270W"], tags: ["amx", "gpu-host", "balanced"] },
  { key: "xeon-8280", brand: "Intel", name: "Xeon Platinum 8280", segment: "datacenter", year: 2019, usd: 700, socket: "LGA3647", arch: "Cascade Lake", cores: 28, threads: 56, base: 2.7, boost: 4.0, l3: 38.5, tdpW: 205, maxW: 240, memGen: "ddr4", memCh: 6, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4608, memMts: 2933, ecc: true, pcieGen: 3, lanes: 48, maxSockets: 8, igpu: false, boxed: false, avx512: true, amx: false, conditions: LEGACY_COND, highlights: ["28 cores for the price of a mid-range GPU", "Only PCIe 3.0 and 48 lanes — fine for CPU work, tight for GPUs", "8-socket capable"], tags: ["value", "budget", "cpu-compute"] },
  { key: "xeon-6248", brand: "Intel", name: "Xeon Gold 6248", segment: "datacenter", year: 2019, usd: 320, socket: "LGA3647", arch: "Cascade Lake", cores: 20, threads: 40, base: 2.5, boost: 3.9, l3: 27.5, tdpW: 150, maxW: 180, memGen: "ddr4", memCh: 6, memKinds: ["rdimm", "lrdimm"], maxMemGb: 1024, memMts: 2933, ecc: true, pcieGen: 3, lanes: 48, maxSockets: 4, igpu: false, boxed: false, avx512: true, amx: false, conditions: LEGACY_COND, highlights: ["Extremely cheap dual-socket compute", "150W each — a 2P node fits a modest power envelope", "Abundant in Pakistan from decommissioned enterprise fleets"], tags: ["value", "budget", "cpu-compute"] },
  { key: "xeon-e5-2680v4", brand: "Intel", name: "Xeon E5-2680 v4", segment: "datacenter", year: 2016, usd: 45, socket: "LGA2011-3", arch: "Broadwell-EP", cores: 14, threads: 28, base: 2.4, boost: 3.3, l3: 35, tdpW: 120, maxW: 140, memGen: "ddr4", memCh: 4, memKinds: ["rdimm", "lrdimm"], maxMemGb: 1536, memMts: 2400, ecc: true, pcieGen: 3, lanes: 40, maxSockets: 2, igpu: false, boxed: false, avx512: false, amx: false, conditions: ["refurb-a", "refurb-b", "pull"], highlights: ["The cheapest real ECC platform you can build in Pakistan", "28 threads per socket for lab and homelab work", "PCIe 3.0 only — do not plan a modern GPU node around it"], tags: ["budget", "homelab", "value"] },

  // ---------------------------------------------- HEDT / workstation
  { key: "tr-7995wx", brand: "AMD", name: "Ryzen Threadripper PRO 7995WX", segment: "workstation", year: 2023, usd: 9999, socket: "sTR5", arch: "Zen 4 (Storm Peak)", cores: 96, threads: 192, base: 2.5, boost: 5.1, l3: 384, tdpW: 350, maxW: 400, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 2048, memMts: 5200, ecc: true, pcieGen: 5, lanes: 128, maxSockets: 1, igpu: false, boxed: true, avx512: true, amx: false, conditions: ["new", "refurb-a"], highlights: ["96 cores and 128 PCIe 5.0 lanes in a desk-side machine", "Registered ECC DDR5 across 8 channels", "The only sane single-socket host for four full-fat GPUs"], tags: ["flagship", "gpu-host", "workstation"] },
  { key: "tr-7975wx", brand: "AMD", name: "Ryzen Threadripper PRO 7975WX", segment: "workstation", year: 2023, usd: 3899, socket: "sTR5", arch: "Zen 4 (Storm Peak)", cores: 32, threads: 64, base: 4.0, boost: 5.3, l3: 128, tdpW: 350, maxW: 400, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 2048, memMts: 5200, ecc: true, pcieGen: 5, lanes: 128, maxSockets: 1, igpu: false, boxed: true, avx512: true, amx: false, conditions: ["new", "refurb-a"], highlights: ["High clocks and the full 128 lanes", "Better single-thread than the 96-core part", "The default AI workstation CPU"], tags: ["gpu-host", "workstation", "balanced"] },
  { key: "tr-5995wx", brand: "AMD", name: "Ryzen Threadripper PRO 5995WX", segment: "workstation", year: 2022, usd: 1900, socket: "sWRX8", arch: "Zen 3 (Chagall)", cores: 64, threads: 128, base: 2.7, boost: 4.5, l3: 256, tdpW: 280, maxW: 320, memGen: "ddr4", memCh: 8, memKinds: ["rdimm"], maxMemGb: 2048, memMts: 3200, ecc: true, pcieGen: 4, lanes: 128, maxSockets: 1, igpu: false, boxed: true, avx512: false, amx: false, conditions: LEGACY_COND, highlights: ["64 cores, 128 PCIe 4.0 lanes, DDR4 pricing", "Excellent value now that Zen 4 has landed", "Still the cheapest 128-lane workstation platform"], tags: ["value", "gpu-host", "workstation"] },
  { key: "xeon-w9-3495x", brand: "Intel", name: "Xeon w9-3495X", segment: "workstation", year: 2023, usd: 5889, socket: "LGA4677", arch: "Sapphire Rapids-WS", cores: 56, threads: 112, base: 1.9, boost: 4.8, l3: 105, tdpW: 350, maxW: 420, memGen: "ddr5", memCh: 8, memKinds: ["rdimm"], maxMemGb: 4096, memMts: 4800, ecc: true, pcieGen: 5, lanes: 112, maxSockets: 1, igpu: false, boxed: true, avx512: true, amx: true, conditions: ["new", "refurb-a"], highlights: ["56 cores with AMX on a workstation socket", "112 PCIe 5.0 lanes", "Overclockable, unusually for a Xeon"], tags: ["amx", "workstation", "gpu-host"] },

  // ------------------------------------------------------- desktop
  { key: "r9-9950x", brand: "AMD", name: "Ryzen 9 9950X", segment: "desktop", year: 2024, usd: 649, socket: "AM5", arch: "Zen 5", cores: 16, threads: 32, base: 4.3, boost: 5.7, l3: 64, tdpW: 170, maxW: 230, memGen: "ddr5", memCh: 2, memKinds: ["udimm"], maxMemGb: 192, memMts: 5600, ecc: true, pcieGen: 5, lanes: 28, maxSockets: 1, igpu: true, boxed: true, avx512: true, amx: false, conditions: ["new", "open-box", "refurb-a"], highlights: ["Full-width AVX-512 on a desktop socket", "Unbuffered ECC works on most B650/X670 boards", "28 lanes total — one GPU plus NVMe, no more"], tags: ["desktop", "creator"] },
  { key: "i9-14900k", brand: "Intel", name: "Core i9-14900K", segment: "desktop", year: 2023, usd: 549, socket: "LGA1700", arch: "Raptor Lake Refresh", cores: 24, threads: 32, base: 3.2, boost: 6.0, l3: 36, tdpW: 125, maxW: 253, memGen: "ddr5", memCh: 2, memKinds: ["udimm"], maxMemGb: 192, memMts: 5600, ecc: false, pcieGen: 5, lanes: 20, maxSockets: 1, igpu: true, boxed: true, avx512: false, amx: false, conditions: ["new", "open-box", "refurb-a"], highlights: ["253W under sustained load — size the cooler for that, not the 125W figure", "Apply the 0x12B microcode update before running it hard", "20 CPU lanes"], tags: ["desktop", "gaming"] },
  { key: "r7-9800x3d", brand: "AMD", name: "Ryzen 7 9800X3D", segment: "desktop", year: 2024, usd: 479, socket: "AM5", arch: "Zen 5 (3D V-Cache)", cores: 8, threads: 16, base: 4.7, boost: 5.2, l3: 96, tdpW: 120, maxW: 162, memGen: "ddr5", memCh: 2, memKinds: ["udimm"], maxMemGb: 192, memMts: 5600, ecc: true, pcieGen: 5, lanes: 28, maxSockets: 1, igpu: true, boxed: true, avx512: true, amx: false, conditions: ["new", "open-box"], highlights: ["96MB L3 — the fastest gaming CPU made", "Cache die moved below the cores, so it clocks and cools properly now", "120W"], tags: ["desktop", "gaming", "flagship"] },
];

/* ==================================================== Motherboard families */

export interface MoboFamily extends FamilyBase {
  socket: string;
  sockets: number;
  chipset: string;
  form: MoboForm;
  memGen: MemGen;
  memSlots: number;
  memKinds: MemKind[];
  maxMemGb: number;
  memMts: number;
  ecc: boolean;
  slots: PcieSlot[];
  m2: number;
  m2Gen: PcieGen;
  sata: number;
  u2: number;
  eps: number;
  nicGbps: number;
  nicPorts: number;
  ipmi: boolean;
  vrm: number;
  flashback: boolean;
}

const s = (gen: PcieGen, width: PcieWidth, lanes: PcieWidth, spacing = 2): PcieSlot => ({ gen, width, lanes, spacing });

export const MOBOS: MoboFamily[] = [
  { key: "h13ssl-n", brand: "Supermicro", name: "H13SSL-N", segment: "datacenter", year: 2023, usd: 780, socket: "SP5", sockets: 1, chipset: "AMD SoC", form: "atx", memGen: "ddr5", memSlots: 12, memKinds: ["rdimm"], maxMemGb: 3072, memMts: 4800, ecc: true, slots: [s(5,16,16,2), s(5,16,16,2), s(5,16,8,1), s(5,8,8,1), s(5,16,16,2)], m2: 2, m2Gen: 5, sata: 8, u2: 2, eps: 2, nicGbps: 1, nicPorts: 2, ipmi: true, vrm: 16, flashback: false, conditions: ["new", "refurb-a", "pull"], highlights: ["All twelve DDR5 channels on a standard ATX footprint", "IPMI with dedicated management port", "The default single-socket Genoa board"], tags: ["ipmi", "single-socket", "atx"] },
  { key: "h12ssl-i", brand: "Supermicro", name: "H12SSL-i", segment: "datacenter", year: 2020, usd: 480, socket: "SP3", sockets: 1, chipset: "AMD SoC", form: "atx", memGen: "ddr4", memSlots: 8, memKinds: ["rdimm", "lrdimm"], maxMemGb: 2048, memMts: 3200, ecc: true, slots: [s(4,16,16,2), s(4,16,16,2), s(4,16,8,1), s(4,8,8,1), s(4,16,16,2)], m2: 2, m2Gen: 4, sata: 8, u2: 2, eps: 2, nicGbps: 1, nicPorts: 2, ipmi: true, vrm: 16, flashback: false, conditions: LEGACY_COND, highlights: ["The cheapest way into 128 PCIe 4.0 lanes", "Takes any Rome or Milan EPYC", "Very common used, usually with the tray"], tags: ["ipmi", "single-socket", "value", "atx"] },
  { key: "mz32-ar0", brand: "GIGABYTE", name: "MZ32-AR0", segment: "datacenter", year: 2021, usd: 620, socket: "SP3", sockets: 1, chipset: "AMD SoC", form: "eatx", memGen: "ddr4", memSlots: 16, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4096, memMts: 3200, ecc: true, slots: [s(4,16,16,2), s(4,16,16,2), s(4,16,16,2), s(4,16,16,2), s(4,8,8,1)], m2: 2, m2Gen: 4, sata: 8, u2: 4, eps: 2, nicGbps: 1, nicPorts: 2, ipmi: true, vrm: 16, flashback: false, conditions: LEGACY_COND, highlights: ["16 DIMM slots — 4TB on one socket", "Four full x16 slots at proper spacing", "E-ATX, so check chassis standoffs"], tags: ["ipmi", "eatx", "large-memory", "gpu-host"] },
  { key: "x13dei", brand: "Supermicro", name: "X13DEI", segment: "datacenter", year: 2023, usd: 1150, socket: "LGA4677", sockets: 2, chipset: "Intel C741", form: "eatx", memGen: "ddr5", memSlots: 16, memKinds: ["rdimm"], maxMemGb: 4096, memMts: 4800, ecc: true, slots: [s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,8,1)], m2: 2, m2Gen: 4, sata: 10, u2: 4, eps: 4, nicGbps: 10, nicPorts: 2, ipmi: true, vrm: 20, flashback: false, conditions: ["new", "refurb-a"], highlights: ["Dual Sapphire/Emerald Rapids with AMX", "Dual 10GbE onboard", "Four EPS headers — two per socket"], tags: ["ipmi", "dual-socket", "eatx", "amx"] },
  { key: "x11dpi-nt", brand: "Supermicro", name: "X11DPi-NT", segment: "datacenter", year: 2017, usd: 340, socket: "LGA3647", sockets: 2, chipset: "Intel C622", form: "eatx", memGen: "ddr4", memSlots: 16, memKinds: ["rdimm", "lrdimm"], maxMemGb: 4096, memMts: 2933, ecc: true, slots: [s(3,16,16,2), s(3,16,16,2), s(3,16,16,2), s(3,8,8,1), s(3,16,8,1)], m2: 1, m2Gen: 3, sata: 14, u2: 2, eps: 4, nicGbps: 10, nicPorts: 2, ipmi: true, vrm: 12, flashback: false, conditions: LEGACY_COND, highlights: ["Dual Cascade Lake for homelab money", "Dual 10GBase-T onboard", "PCIe 3.0 only — the honest limit of this platform"], tags: ["ipmi", "dual-socket", "budget", "homelab"] },
  { key: "wrx90e-sage", brand: "ASUS", name: "Pro WS WRX90E-SAGE SE", segment: "workstation", year: 2023, usd: 1300, socket: "sTR5", sockets: 1, chipset: "AMD WRX90", form: "eatx", memGen: "ddr5", memSlots: 8, memKinds: ["rdimm"], maxMemGb: 2048, memMts: 5200, ecc: true, slots: [s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,16,2), s(5,16,16,2)], m2: 4, m2Gen: 5, sata: 4, u2: 0, eps: 3, nicGbps: 10, nicPorts: 2, ipmi: true, vrm: 16, flashback: true, conditions: ["new", "refurb-a"], highlights: ["Seven x16 PCIe 5.0 slots, all electrically x16", "Three EPS headers for the 350W Threadripper PRO parts", "Dual 10GbE plus BMC"], tags: ["gpu-host", "eatx", "workstation", "dense"] },
  { key: "x670e-hero", brand: "ASUS", name: "ROG Crosshair X670E Hero", segment: "desktop", year: 2022, usd: 630, socket: "AM5", sockets: 1, chipset: "AMD X670E", form: "atx", memGen: "ddr5", memSlots: 4, memKinds: ["udimm"], maxMemGb: 192, memMts: 6400, ecc: true, slots: [s(5,16,16,3), s(5,16,8,2), s(4,16,4,2)], m2: 5, m2Gen: 5, sata: 6, u2: 0, eps: 2, nicGbps: 2.5, nicPorts: 1, ipmi: false, vrm: 18, flashback: true, conditions: ["new", "open-box", "refurb-a"], highlights: ["Five M.2 slots, two at PCIe 5.0", "BIOS Flashback for CPU upgrades without a booting chip", "Unbuffered ECC passes through on Ryzen"], tags: ["desktop", "atx", "enthusiast"] },
  { key: "z790-ace", brand: "MSI", name: "MEG Z790 ACE", segment: "desktop", year: 2022, usd: 590, socket: "LGA1700", sockets: 1, chipset: "Intel Z790", form: "eatx", memGen: "ddr5", memSlots: 4, memKinds: ["udimm"], maxMemGb: 192, memMts: 7200, ecc: false, slots: [s(5,16,16,3), s(5,16,8,2), s(4,16,4,2)], m2: 5, m2Gen: 5, sata: 6, u2: 0, eps: 2, nicGbps: 10, nicPorts: 1, ipmi: false, vrm: 24, flashback: true, conditions: ["new", "open-box", "refurb-a"], highlights: ["24-phase VRM, which the 14900K genuinely needs", "10GbE onboard", "No ECC — Intel reserves that for W-series"], tags: ["desktop", "eatx", "enthusiast"] },
];

/* ========================================================= Memory families */

export interface MemFamily extends FamilyBase {
  memGen: MemGen;
  memKind: MemKind;
  /** Capacities offered for this line, in GB per module. */
  caps: number[];
  /** Kit sizes offered (module count). */
  kits: number[];
  mts: number;
  cl: number;
  ecc: boolean;
  ranks: string;
  volts: number;
  heightMm: number;
  registered: boolean;
  /** USD per GB, used to price each capacity. */
  usdPerGb: number;
}

export const MEMORY: MemFamily[] = [
  { key: "sk-ddr5-rdimm-5600", brand: "SK hynix", name: "DDR5-5600 RDIMM", segment: "datacenter", year: 2023, usd: 0, usdPerGb: 5.2, memGen: "ddr5", memKind: "rdimm", caps: [16, 32, 64, 96, 128], kits: [1, 8, 12, 16, 24], mts: 5600, cl: 46, ecc: true, ranks: "2Rx4", volts: 1.1, heightMm: 31, registered: true, conditions: ["new", "refurb-a", "pull"], highlights: ["Populate every channel — a half-populated Genoa loses a third of its bandwidth", "1.1V", "Registered: will not post in a consumer board"], tags: ["ecc", "registered", "server"] },
  { key: "samsung-ddr5-rdimm-4800", brand: "Samsung", name: "DDR5-4800 RDIMM", segment: "datacenter", year: 2022, usd: 0, usdPerGb: 4.1, memGen: "ddr5", memKind: "rdimm", caps: [16, 32, 64, 128], kits: [1, 8, 12, 16], mts: 4800, cl: 40, ecc: true, ranks: "2Rx4", volts: 1.1, heightMm: 31, registered: true, conditions: ["new", "refurb-a", "pull"], highlights: ["The Sapphire Rapids and Genoa baseline speed", "Widely available as tested pulls from cloud refreshes", "2Rx4 for maximum capacity per channel"], tags: ["ecc", "registered", "server", "value"] },
  { key: "micron-ddr4-rdimm-3200", brand: "Micron", name: "DDR4-3200 RDIMM", segment: "datacenter", year: 2019, usd: 0, usdPerGb: 1.5, memGen: "ddr4", memKind: "rdimm", caps: [16, 32, 64], kits: [1, 8, 16], mts: 3200, cl: 22, ecc: true, ranks: "2Rx4", volts: 1.2, heightMm: 31, registered: true, conditions: LEGACY_COND, highlights: ["Dirt cheap per GB — 512GB for a Milan node costs less than one GPU", "Matches EPYC 7003 and Ice Lake Xeon", "Enormous supply from datacenter decommissions"], tags: ["ecc", "registered", "server", "value", "budget"] },
  { key: "micron-ddr4-lrdimm-2933", brand: "Micron", name: "DDR4-2933 LRDIMM", segment: "datacenter", year: 2019, usd: 0, usdPerGb: 1.9, memGen: "ddr4", memKind: "lrdimm", caps: [64, 128, 256], kits: [1, 8, 12, 24], mts: 2933, cl: 21, ecc: true, ranks: "4Rx4", volts: 1.2, heightMm: 31, registered: true, conditions: LEGACY_COND, highlights: ["Load-reduced buffering is how you reach 4TB+ per node", "Slightly higher latency than RDIMM, much higher ceiling", "Board must explicitly list LRDIMM support"], tags: ["ecc", "registered", "large-memory", "server"] },
  { key: "kingston-ddr5-ecc-udimm", brand: "Kingston", name: "Server Premier DDR5-5600 ECC UDIMM", segment: "workstation", year: 2023, usd: 0, usdPerGb: 6.0, memGen: "ddr5", memKind: "udimm", caps: [16, 32, 48], kits: [1, 2, 4], mts: 5600, cl: 46, ecc: true, ranks: "2Rx8", volts: 1.1, heightMm: 32, registered: false, conditions: ["new", "refurb-a"], highlights: ["Unbuffered ECC — the AM5 and Xeon E workstation path", "Works in most B650/X670 boards with ECC enabled in BIOS", "No register, so no server board compatibility"], tags: ["ecc", "unbuffered", "workstation"] },
  { key: "gskill-ddr5-6000", brand: "G.Skill", name: "Trident Z5 Neo RGB DDR5-6000 CL30", segment: "desktop", year: 2023, usd: 0, usdPerGb: 3.4, memGen: "ddr5", memKind: "udimm", caps: [16, 24, 32, 48], kits: [2, 4], mts: 6000, cl: 30, ecc: false, ranks: "1Rx8", volts: 1.35, heightMm: 44, registered: false, conditions: ["new", "open-box"], highlights: ["DDR5-6000 CL30 is the AM5 sweet spot — 1:1 with the memory controller", "44mm tall; conflicts with some 160mm+ air towers", "EXPO and XMP profiles both present"], tags: ["gaming", "expo", "tall"] },
];

/* ======================================================== Storage families */

export interface StorageFamily extends FamilyBase {
  bus: StorageBus;
  caps: number[];
  media: "nvme-tlc" | "nvme-qlc" | "nvme-slc" | "sata-tlc" | "hdd-cmr" | "hdd-smr";
  readMbs: number;
  writeMbs: number;
  readIops: number;
  writeIops: number;
  dwpd: number;
  pcieGen?: PcieGen;
  pcieWidth?: PcieWidth;
  physical: string;
  plp: boolean;
  tdpW: number;
  usdPerTb: number;
}

export const STORAGE: StorageFamily[] = [
  { key: "kioxia-cd8", brand: "KIOXIA", name: "CD8-R Series U.3 NVMe", segment: "datacenter", year: 2022, usd: 0, usdPerTb: 105, bus: "u3", caps: [1920, 3840, 7680, 15360], media: "nvme-tlc", readMbs: 7200, writeMbs: 6000, readIops: 1250000, writeIops: 260000, dwpd: 1, pcieGen: 4, pcieWidth: 4, physical: "2.5in-15mm", plp: true, tdpW: 20, conditions: ["new", "refurb-a", "pull"], highlights: ["U.3 — drops into a U.2 backplane, but the reverse is not true", "Power-loss protection with onboard capacitors", "1 DWPD read-intensive endurance"], tags: ["nvme", "plp", "hotswap", "server"] },
  { key: "samsung-pm9a3", brand: "Samsung", name: "PM9A3 U.2 NVMe", segment: "datacenter", year: 2021, usd: 0, usdPerTb: 88, bus: "u2", caps: [960, 1920, 3840, 7680], media: "nvme-tlc", readMbs: 6800, writeMbs: 4000, readIops: 1000000, writeIops: 180000, dwpd: 1, pcieGen: 4, pcieWidth: 4, physical: "2.5in-7mm", plp: true, tdpW: 18, conditions: ["new", "refurb-a", "pull"], highlights: ["The most common datacenter U.2 drive on the used market", "Check remaining endurance in SMART before you buy any pull", "PLP present"], tags: ["nvme", "plp", "hotswap", "value"] },
  { key: "solidigm-p5336", brand: "Solidigm", name: "D5-P5336 U.2 QLC", segment: "datacenter", year: 2023, usd: 0, usdPerTb: 62, bus: "u2", caps: [7680, 15360, 30720, 61440], media: "nvme-qlc", readMbs: 7000, writeMbs: 3300, readIops: 1005000, writeIops: 43000, dwpd: 0.3, pcieGen: 4, pcieWidth: 4, physical: "2.5in-15mm", plp: true, tdpW: 25, conditions: ["new"], highlights: ["61.44TB in one 2.5in bay — a petabyte in 2U", "QLC: excellent for read-heavy datasets, poor for write-amplifying workloads", "0.3 DWPD, so size it honestly"], tags: ["nvme", "qlc", "capacity", "dataset"] },
  { key: "sn850x", brand: "Western Digital", name: "WD_BLACK SN850X M.2 NVMe", segment: "desktop", year: 2022, usd: 0, usdPerTb: 78, bus: "m2-nvme", caps: [1000, 2000, 4000, 8000], media: "nvme-tlc", readMbs: 7300, writeMbs: 6600, readIops: 1200000, writeIops: 1100000, dwpd: 0.3, pcieGen: 4, pcieWidth: 4, physical: "2280", plp: false, tdpW: 9, conditions: ["new", "open-box"], highlights: ["Fast enough that the bottleneck moves elsewhere", "No power-loss protection — not for a database node", "Runs hot; use the board heatsink"], tags: ["nvme", "m2", "desktop", "fast"] },
  { key: "exos-x24", brand: "Seagate", name: "Exos X24 SAS", segment: "datacenter", year: 2024, usd: 0, usdPerTb: 17, bus: "sas3", caps: [12000, 16000, 20000, 24000], media: "hdd-cmr", readMbs: 285, writeMbs: 285, readIops: 170, writeIops: 440, dwpd: 0, physical: "3.5in", plp: false, tdpW: 10, conditions: ["new", "refurb-a", "pull"], highlights: ["CMR, not SMR — safe for RAID and ZFS rebuilds", "Helium sealed, 550TB/yr rated workload", "The cheapest bulk capacity that is still trustworthy"], tags: ["hdd", "cmr", "capacity", "bulk"] },
];

/* ============================================================ PSU families */

export interface PsuFamily extends FamilyBase {
  watts: number[];
  form: PsuForm;
  eff: "80+ bronze" | "80+ gold" | "80+ platinum" | "80+ titanium";
  atx: "2.4" | "3.0" | "3.1";
  modular: "full" | "semi" | "none";
  /** Connector counts at the largest wattage in the line. */
  conn: Partial<Record<PowerConnector, number>>;
  redundancy: number;
  vMin: number;
  derate230: number;
  depthMm: number;
  usdPerKw: number;
}

export const PSUS: PsuFamily[] = [
  { key: "corsair-ax", brand: "Corsair", name: "AX Series Titanium", segment: "workstation", year: 2023, usd: 0, usdPerKw: 340, watts: [1000, 1200, 1600], form: "atx", eff: "80+ titanium", atx: "3.1", modular: "full", conn: { "12v2x6": 2, "pcie-8": 8, "eps-8": 2, "sata-power": 12 }, redundancy: 1, vMin: 100, derate230: 1.0, depthMm: 200, conditions: ["new", "refurb-a"], highlights: ["ATX 3.1 with native 12V-2x6 — no adapters anywhere in the build", "Full output at 230V, which is what Pakistan runs", "Two GPU power leads at 1600W"], tags: ["titanium", "atx31", "multi-gpu"] },
  { key: "seasonic-prime-tx", brand: "Seasonic", name: "PRIME TX Titanium", segment: "workstation", year: 2022, usd: 0, usdPerKw: 310, watts: [750, 850, 1000, 1300], form: "atx", eff: "80+ titanium", atx: "3.0", modular: "full", conn: { "12vhpwr": 1, "pcie-8": 6, "eps-8": 2, "sata-power": 10 }, redundancy: 1, vMin: 100, derate230: 1.0, depthMm: 170, conditions: ["new", "open-box", "refurb-a"], highlights: ["12-year warranty, the longest in the market", "170mm deep — fits cases that reject 200mm units", "ATX 3.0, so one 12VHPWR only"], tags: ["titanium", "quiet", "reliable"] },
  { key: "msi-mpg-a", brand: "MSI", name: "MPG A-series Gold", segment: "desktop", year: 2023, usd: 0, usdPerKw: 165, watts: [650, 750, 850, 1000], form: "atx", eff: "80+ gold", atx: "3.0", modular: "full", conn: { "12vhpwr": 1, "pcie-8": 4, "eps-8": 2, "sata-power": 8 }, redundancy: 1, vMin: 100, derate230: 1.0, depthMm: 160, conditions: ["new", "open-box"], highlights: ["Sensible gold-rated power for a single-GPU build", "Native 12VHPWR at 850W and up", "160mm, fits compact mid-towers"], tags: ["gold", "value", "desktop"] },
  { key: "smc-crps", brand: "Supermicro", name: "CRPS Redundant Module", segment: "datacenter", year: 2021, usd: 0, usdPerKw: 260, watts: [1200, 1600, 2000, 2600], form: "crps", eff: "80+ platinum", atx: "2.4", modular: "none", conn: { "eps-8": 4, "pcie-8": 4, "sata-power": 6 }, redundancy: 2, vMin: 100, derate230: 1.0, depthMm: 185, conditions: ["new", "refurb-a", "pull"], highlights: ["1+1 redundant — pull one module live and the node keeps running", "Above 1600W these need 200V+ input, which Pakistani mains supplies", "Hot-swap from the rear"], tags: ["redundant", "hotswap", "rack", "platinum"] },
  { key: "smc-crps-2u-hi", brand: "Supermicro", name: "CRPS 2U High-Output", segment: "datacenter", year: 2023, usd: 0, usdPerKw: 300, watts: [3000, 3200, 5250], form: "redundant-2u", eff: "80+ titanium", atx: "2.4", modular: "none", conn: { "12v2x6": 8, "eps-8": 4, "pcie-8": 12, "sata-power": 8 }, redundancy: 2, vMin: 200, derate230: 1.0, depthMm: 265, conditions: ["new"], highlights: ["Feeds an 8-GPU node — 5250W in a 2+2 arrangement", "200-240V input only; will not start on 110V", "Titanium efficiency matters at this draw"], tags: ["redundant", "rack", "titanium", "gpu-dense", "high-power"] },
];

/* ========================================================= Cooler families */

export interface CoolerFamily extends FamilyBase {
  type: "air-tower" | "air-low" | "aio" | "passive-1u" | "passive-2u" | "coldplate";
  sockets: string[];
  tdpW: number;
  heightMm: number;
  radMm: number;
  needsAirflow: boolean;
  dba: number;
}

export const COOLERS: CoolerFamily[] = [
  { key: "nh-d15-g2", brand: "Noctua", name: "NH-D15 G2", segment: "desktop", year: 2024, usd: 150, type: "air-tower", sockets: ["AM5", "AM4", "LGA1700", "LGA1851"], tdpW: 280, heightMm: 168, radMm: 0, needsAirflow: false, dba: 24, conditions: ["new", "open-box"], highlights: ["Handles a 253W 14900K without throttling", "168mm — verify case clearance", "Blocks tall DIMMs on the first slot"], tags: ["air", "quiet", "tall"] },
  { key: "nh-u9-tr5", brand: "Noctua", name: "NH-U9 TR5-SP6", segment: "workstation", year: 2024, usd: 130, type: "air-tower", sockets: ["sTR5", "SP6"], tdpW: 350, heightMm: 125, radMm: 0, needsAirflow: false, dba: 26, conditions: ["new"], highlights: ["Covers the full sTR5 IHS, which most coolers do not", "125mm tall, so it clears 4U lids", "Rated for the 350W Threadripper PRO parts"], tags: ["air", "threadripper", "workstation"] },
  { key: "arctic-lf3-420", brand: "Arctic", name: "Liquid Freezer III 420", segment: "desktop", year: 2024, usd: 110, type: "aio", sockets: ["AM5", "AM4", "LGA1700", "LGA1851"], tdpW: 350, heightMm: 0, radMm: 420, needsAirflow: false, dba: 28, conditions: ["new", "open-box"], highlights: ["420mm radiator — very few cases take one, check first", "VRM fan built into the block", "Best cooling per rupee available"], tags: ["aio", "liquid", "value"] },
  { key: "smc-snk-p0064ap4", brand: "Supermicro", name: "SNK-P0064AP4 2U Active", segment: "datacenter", year: 2022, usd: 75, type: "passive-2u", sockets: ["SP5"], tdpW: 400, heightMm: 78, radMm: 0, needsAirflow: true, dba: 45, conditions: ["new", "pull"], highlights: ["2U heatsink for SP5, rated to 400W", "Relies entirely on chassis static pressure — useless in a tower", "78mm tall"], tags: ["rack", "2u", "passive"] },
  { key: "smc-snk-p0084p", brand: "Supermicro", name: "SNK-P0084P 1U Passive", segment: "datacenter", year: 2022, usd: 62, type: "passive-1u", sockets: ["LGA4677"], tdpW: 350, heightMm: 27, radMm: 0, needsAirflow: true, dba: 0, conditions: ["new", "pull"], highlights: ["27mm — the only thing that fits under a 1U lid", "Needs 40mm fans at full tilt behind it", "No fan of its own"], tags: ["rack", "1u", "passive"] },
  { key: "cool-it-coldplate", brand: "CoolIT", name: "Direct-to-Chip Cold Plate", segment: "datacenter", year: 2024, usd: 420, type: "coldplate", sockets: ["SP5", "LGA4677", "sTR5"], tdpW: 700, heightMm: 40, radMm: 0, needsAirflow: false, dba: 0, conditions: ["new"], highlights: ["700W per socket — the only option above 500W in 1U", "Requires a CDU and facility water loop", "Quick-disconnect fittings, dry-break"], tags: ["liquid", "rack", "high-power", "facility"] },
];

/* ======================================================== Chassis families */

export interface ChassisFamily extends FamilyBase {
  form: ChassisForm;
  rackU: number;
  moboForms: MoboForm[];
  psuForms: PsuForm[];
  maxGpuMm: number;
  maxCoolerMm: number;
  maxRadMm: number;
  slots: number;
  bays35: number;
  bays25: number;
  hotSwap: number;
  backplane: StorageBus | "none";
  airflow: boolean;
  maxGpus: number;
  depthMm: number;
  kg: number;
}

export const CHASSIS: ChassisFamily[] = [
  { key: "fractal-define7-xl", brand: "Fractal Design", name: "Define 7 XL", segment: "workstation", year: 2020, usd: 250, form: "full-tower", rackU: 0, moboForms: ["atx", "matx", "itx", "eatx", "ssi-eeb"], psuForms: ["atx", "sfx"], maxGpuMm: 467, maxCoolerMm: 185, maxRadMm: 420, slots: 9, bays35: 14, bays25: 4, hotSwap: 0, backplane: "none", airflow: false, maxGpus: 3, depthMm: 547, kg: 16, conditions: ["new", "open-box"], highlights: ["Takes SSI-EEB, so Threadripper PRO boards fit", "467mm GPU clearance swallows anything", "Sound-damped; swap the front panel for airflow if you go multi-GPU"], tags: ["tower", "quiet", "eatx", "workstation"] },
  { key: "phanteks-enthoo-pro2", brand: "Phanteks", name: "Enthoo Pro 2 Server Edition", segment: "workstation", year: 2020, usd: 180, form: "full-tower", rackU: 0, moboForms: ["atx", "matx", "itx", "eatx", "ssi-eeb", "ssi-ceb"], psuForms: ["atx", "sfx"], maxGpuMm: 503, maxCoolerMm: 195, maxRadMm: 480, slots: 8, bays35: 12, bays25: 4, hotSwap: 0, backplane: "none", airflow: false, maxGpus: 4, depthMm: 560, kg: 14, conditions: ["new", "open-box"], highlights: ["Explicitly supports SSI-EEB server boards and dual PSUs", "Four GPUs if you use blower cards", "503mm clearance"], tags: ["tower", "eatx", "dense", "value"] },
  { key: "smc-cse-745", brand: "Supermicro", name: "CSE-745TQ 4U Tower/Rack", segment: "datacenter", year: 2019, usd: 520, form: "4u", rackU: 4, moboForms: ["atx", "eatx", "ssi-eeb", "ssi-ceb"], psuForms: ["crps", "redundant-2u"], maxGpuMm: 330, maxCoolerMm: 160, maxRadMm: 0, slots: 7, bays35: 8, bays25: 0, hotSwap: 8, backplane: "sas3", airflow: true, maxGpus: 4, depthMm: 660, kg: 22, conditions: ["new", "refurb-a", "pull"], highlights: ["Converts between tower and 4U rack with a rail kit", "Eight hot-swap SAS3 bays", "Forced airflow, so passive datacenter GPUs work"], tags: ["rack", "4u", "hotswap", "convertible"] },
  { key: "smc-cse-418", brand: "Supermicro", name: "CSE-418GTS 4U GPU", segment: "datacenter", year: 2022, usd: 2400, form: "4u", rackU: 4, moboForms: ["eatx", "proprietary"], psuForms: ["redundant-2u"], maxGpuMm: 320, maxCoolerMm: 80, maxRadMm: 0, slots: 11, bays35: 0, bays25: 10, hotSwap: 10, backplane: "u2", airflow: true, maxGpus: 8, depthMm: 838, kg: 40, conditions: ["new", "refurb-a"], highlights: ["Eight double-width GPUs with proper front-to-back airflow", "Ten U.2 NVMe hot-swap bays", "838mm deep — measure your rack before ordering"], tags: ["rack", "4u", "gpu-dense", "hotswap", "nvme"] },
  { key: "smc-cse-116", brand: "Supermicro", name: "CSE-116AC10 1U", segment: "datacenter", year: 2022, usd: 900, form: "1u", rackU: 1, moboForms: ["atx", "proprietary"], psuForms: ["crps"], maxGpuMm: 169, maxCoolerMm: 27, maxRadMm: 0, slots: 2, bays35: 0, bays25: 10, hotSwap: 10, backplane: "u2", airflow: true, maxGpus: 2, depthMm: 650, kg: 16, conditions: ["new", "refurb-a", "pull"], highlights: ["Ten U.2 bays in 1U", "Only low-profile cards fit — L4 yes, L40S no", "27mm cooler ceiling"], tags: ["rack", "1u", "hotswap", "nvme", "dense"] },
  { key: "mining-frame-12", brand: "Veddha", name: "T2 12-GPU Open Frame", segment: "edge", year: 2021, usd: 190, form: "open-frame", rackU: 0, moboForms: ["atx", "matx", "eatx"], psuForms: ["atx"], maxGpuMm: 340, maxCoolerMm: 170, maxRadMm: 0, slots: 12, bays35: 2, bays25: 2, hotSwap: 0, backplane: "none", airflow: false, maxGpus: 12, depthMm: 700, kg: 9, conditions: ["new", "open-box"], highlights: ["Twelve GPUs on risers with real spacing between them", "Open air — filter the room, not the case", "Dual PSU mounting for split rails"], tags: ["open-frame", "gpu-dense", "rig", "value"] },
];

/* ============================================================ NIC families */

export interface NicFamily extends FamilyBase {
  fabric: Fabric;
  gbps: number;
  ports: number;
  portType: PortType;
  pcieGen: PcieGen;
  pcieWidth: PcieWidth;
  tdpW: number;
  rdma: boolean;
  sriov: boolean;
  gpuDirect: boolean;
  lowProfile: boolean;
}

export const NICS: NicFamily[] = [
  { key: "cx7-ndr", brand: "NVIDIA", name: "ConnectX-7 NDR400 OSFP", segment: "datacenter", year: 2022, usd: 2400, fabric: "both", gbps: 400, ports: 1, portType: "osfp", pcieGen: 5, pcieWidth: 16, tdpW: 26, rdma: true, sriov: true, gpuDirect: true, lowProfile: false, conditions: ["new", "refurb-a"], highlights: ["400Gb NDR InfiniBand or 400GbE on the same card", "GPUDirect RDMA straight into GPU memory", "Needs a full PCIe 5.0 x16 — an x8 slot halves it"], tags: ["infiniband", "400g", "gpudirect", "rdma"] },
  { key: "cx6-hdr", brand: "NVIDIA", name: "ConnectX-6 HDR200 QSFP56", segment: "datacenter", year: 2020, usd: 900, fabric: "both", gbps: 200, ports: 1, portType: "qsfp56", pcieGen: 4, pcieWidth: 16, tdpW: 21, rdma: true, sriov: true, gpuDirect: true, lowProfile: false, conditions: ["new", "refurb-a", "pull"], highlights: ["200Gb HDR — the value fabric for a Pakistani cluster build", "Huge supply of tested pulls", "PCIe 4.0 x16"], tags: ["infiniband", "200g", "gpudirect", "rdma", "value"] },
  { key: "cx5-edr", brand: "NVIDIA", name: "ConnectX-5 EDR100 QSFP28", segment: "datacenter", year: 2017, usd: 260, fabric: "both", gbps: 100, ports: 2, portType: "qsfp28", pcieGen: 3, pcieWidth: 16, tdpW: 17, rdma: true, sriov: true, gpuDirect: true, lowProfile: true, conditions: LEGACY_COND, highlights: ["100Gb for less than a mid-range GPU", "Dual port, low-profile bracket included", "The entry point for RDMA experimentation"], tags: ["infiniband", "100g", "rdma", "value", "budget", "low-profile"] },
  { key: "intel-e810", brand: "Intel", name: "E810-CQDA2 100GbE", segment: "datacenter", year: 2020, usd: 780, fabric: "ethernet", gbps: 100, ports: 2, portType: "qsfp28", pcieGen: 4, pcieWidth: 16, tdpW: 19, rdma: true, sriov: true, gpuDirect: false, lowProfile: true, conditions: ["new", "refurb-a", "pull"], highlights: ["RoCEv2 and iWARP both supported", "Excellent DPDK and SR-IOV support", "Ethernet only — no InfiniBand mode"], tags: ["ethernet", "100g", "rdma", "roce"] },
  { key: "intel-x710", brand: "Intel", name: "X710-DA2 10GbE SFP+", segment: "datacenter", year: 2015, usd: 130, fabric: "ethernet", gbps: 10, ports: 2, portType: "sfp+", pcieGen: 3, pcieWidth: 8, tdpW: 7, rdma: false, sriov: true, gpuDirect: false, lowProfile: true, conditions: LEGACY_COND, highlights: ["The workhorse 10G card, everywhere and cheap", "Fussy about third-party optics unless you unlock the port", "Low profile bracket"], tags: ["ethernet", "10g", "value", "budget", "low-profile"] },
];

/* ========================================================= Switch families */

export interface SwitchFamily extends FamilyBase {
  fabric: Fabric;
  ports: number;
  gbps: number;
  portType: PortType;
  rackU: number;
  tbps: number;
  tdpW: number;
  managed: boolean;
  airflow: "front-to-back" | "back-to-front" | "reversible";
  psuRedundant: boolean;
}

export const SWITCHES: SwitchFamily[] = [
  { key: "qm9700", brand: "NVIDIA", name: "Quantum-2 QM9700 NDR", segment: "datacenter", year: 2022, usd: 42000, fabric: "infiniband", ports: 32, gbps: 400, portType: "osfp", rackU: 1, tbps: 51.2, tdpW: 1400, managed: true, airflow: "reversible", psuRedundant: true, conditions: ["new"], highlights: ["32 OSFP cages, 64 NDR200 ports with splitters", "51.2 Tb/s in 1U", "SHARP in-network reduction offloads all-reduce"], tags: ["infiniband", "400g", "spine", "flagship"] },
  { key: "qm8700", brand: "NVIDIA", name: "Quantum QM8700 HDR", segment: "datacenter", year: 2019, usd: 14000, fabric: "infiniband", ports: 40, gbps: 200, portType: "qsfp56", rackU: 1, tbps: 16, tdpW: 700, managed: true, airflow: "reversible", psuRedundant: true, conditions: ["new", "refurb-a", "pull"], highlights: ["40 HDR200 ports, or 80 HDR100 with splitter cables", "The practical spine for a 32-node cluster", "Available refurbished at a fraction of new"], tags: ["infiniband", "200g", "spine", "value"] },
  { key: "sn2410", brand: "NVIDIA", name: "Spectrum SN2410 25/100GbE", segment: "datacenter", year: 2018, usd: 5200, fabric: "ethernet", ports: 48, gbps: 25, portType: "sfp28", rackU: 1, tbps: 4, tdpW: 250, managed: true, airflow: "reversible", psuRedundant: true, conditions: ["new", "refurb-a", "pull"], highlights: ["48x 25G plus 8x 100G uplinks", "Cumulus Linux or ONIE — run what you like", "Lossless RoCE with proper PFC support"], tags: ["ethernet", "25g", "leaf", "roce"] },
  { key: "mikrotik-crs504", brand: "MikroTik", name: "CRS504-4XQ-IN 100GbE", segment: "edge", year: 2022, usd: 700, fabric: "ethernet", ports: 4, gbps: 100, portType: "qsfp28", rackU: 1, tbps: 0.8, tdpW: 60, managed: true, airflow: "reversible", psuRedundant: true, conditions: ["new"], highlights: ["Four 100G ports for the price of one enterprise NIC", "Fanless option, genuinely silent", "RouterOS — capable, but the learning curve is real"], tags: ["ethernet", "100g", "value", "budget", "edge"] },
];

/* ========================================================== Optic families */

export interface OpticFamily extends FamilyBase {
  media: "dac-passive" | "dac-active" | "aoc" | "sr" | "lr" | "fr" | "dr";
  portType: PortType;
  gbps: number;
  lengths: number[];
  reachM: number;
  codedFor: string[];
  fabric: Fabric;
  powerW: number;
}

export const OPTICS: OpticFamily[] = [
  { key: "dac-100g", brand: "FS", name: "100G QSFP28 Passive DAC", segment: "datacenter", year: 2021, usd: 45, media: "dac-passive", portType: "qsfp28", gbps: 100, lengths: [0.5, 1, 2, 3, 5], reachM: 5, codedFor: ["NVIDIA/Mellanox", "Cisco", "Arista", "Juniper", "Generic"], fabric: "both", powerW: 0, conditions: ["new"], highlights: ["Cheapest way to link two boxes in the same rack", "Zero power draw, zero latency added", "Coding matters — a Cisco-coded cable will not light in an Arista"], tags: ["dac", "100g", "in-rack", "value"] },
  { key: "aoc-200g", brand: "FS", name: "200G QSFP56 AOC", segment: "datacenter", year: 2022, usd: 320, media: "aoc", portType: "qsfp56", gbps: 200, lengths: [3, 5, 10, 20, 30], reachM: 30, codedFor: ["NVIDIA/Mellanox", "Generic"], fabric: "infiniband", powerW: 4.5, conditions: ["new"], highlights: ["Active optical, so it bends and runs the length of a row", "Pre-terminated — no field polishing", "HDR InfiniBand rated"], tags: ["aoc", "200g", "infiniband", "cross-rack"] },
  { key: "sr4-100g", brand: "FS", name: "100G QSFP28 SR4 MMF", segment: "datacenter", year: 2020, usd: 95, media: "sr", portType: "qsfp28", gbps: 100, lengths: [0], reachM: 100, codedFor: ["NVIDIA/Mellanox", "Cisco", "Arista", "Generic"], fabric: "ethernet", powerW: 3.5, conditions: ["new", "refurb-a"], highlights: ["100m over OM4 multimode with an MPO-12 trunk", "Module only — fibre ordered separately", "3.5W per module adds up across 48 ports"], tags: ["optic", "100g", "multimode"] },
  { key: "sfp28-25g-dac", brand: "FS", name: "25G SFP28 Passive DAC", segment: "datacenter", year: 2020, usd: 22, media: "dac-passive", portType: "sfp28", gbps: 25, lengths: [0.5, 1, 2, 3, 5], reachM: 5, codedFor: ["NVIDIA/Mellanox", "Cisco", "Arista", "Intel", "Generic"], fabric: "ethernet", powerW: 0, conditions: ["new"], highlights: ["Standard leaf-to-node link in a 25G fabric", "Intel NICs need matching coding or the port stays dark", "No power draw"], tags: ["dac", "25g", "in-rack", "value"] },
];

/* ================================================ Rack / PDU / UPS families */

export interface RackFamily extends FamilyBase {
  heightU: number;
  widthMm: number;
  depthMm: number;
  loadKg: number;
  perfPct: number;
  pduSlots: number;
  shielded: boolean;
}

export const RACKS: RackFamily[] = [
  { key: "apc-nk-42u", brand: "APC", name: "NetShelter SX 42U", segment: "datacenter", year: 2020, usd: 1600, heightU: 42, widthMm: 600, depthMm: 1070, loadKg: 1364, perfPct: 78, pduSlots: 4, shielded: false, conditions: ["new", "refurb-a", "pull"], highlights: ["1070mm deep — takes an 838mm GPU chassis with cable room", "78% perforation front and rear", "1364kg static load"], tags: ["42u", "deep", "gpu-ready"] },
  { key: "apc-nk-42u-wide", brand: "APC", name: "NetShelter SX 42U Wide", segment: "datacenter", year: 2020, usd: 2100, heightU: 42, widthMm: 750, depthMm: 1070, loadKg: 1364, perfPct: 78, pduSlots: 6, shielded: false, conditions: ["new", "refurb-a"], highlights: ["750mm wide gives real cable-management channels", "Six vertical PDU positions", "Necessary once you are running 400G optics"], tags: ["42u", "wide", "deep", "gpu-ready"] },
  { key: "generic-27u", brand: "Toten", name: "27U Floor Standing", segment: "edge", year: 2021, usd: 420, heightU: 27, widthMm: 600, depthMm: 800, loadKg: 500, perfPct: 65, pduSlots: 2, shielded: false, conditions: ["new"], highlights: ["Fits a small office server room", "800mm depth — too shallow for a deep GPU chassis", "Widely stocked in Pakistan"], tags: ["27u", "office", "value"] },
];

export interface PduFamily extends FamilyBase {
  outlets: number;
  outletType: string;
  phases: 1 | 3;
  amps: number;
  kw: number;
  metered: boolean;
  switched: boolean;
  rackU: number;
  volts: number;
}

export const PDUS: PduFamily[] = [
  { key: "apc-ap8959", brand: "APC", name: "AP8959 Switched Rack PDU", segment: "datacenter", year: 2019, usd: 1250, outlets: 24, outletType: "C13/C19", phases: 1, amps: 32, kw: 7.4, metered: true, switched: true, rackU: 0, volts: 230, conditions: ["new", "refurb-a", "pull"], highlights: ["Per-outlet switching and metering over the network", "7.4kW single-phase at 230V", "Zero-U vertical mount"], tags: ["switched", "metered", "230v", "zero-u"] },
  { key: "apc-ap8886", brand: "APC", name: "AP8886 3-Phase Metered PDU", segment: "datacenter", year: 2019, usd: 2200, outlets: 42, outletType: "C13/C19", phases: 3, amps: 32, kw: 22, metered: true, switched: false, rackU: 0, volts: 400, conditions: ["new", "refurb-a"], highlights: ["22kW — what an 8-GPU node rack actually needs", "3-phase 400V, so you will need the supply provisioned", "Per-phase metering to catch imbalance"], tags: ["3-phase", "metered", "high-power", "zero-u"] },
  { key: "basic-pdu-8", brand: "Toten", name: "1U Basic PDU 8-Way", segment: "edge", year: 2021, usd: 60, outlets: 8, outletType: "Universal", phases: 1, amps: 16, kw: 3.6, metered: false, switched: false, rackU: 1, volts: 230, conditions: ["new"], highlights: ["Unmetered strip for a lab rack", "3.6kW at 16A", "Universal sockets suit mixed Pakistani plug types"], tags: ["basic", "230v", "value"] },
];

export interface UpsFamily extends FamilyBase {
  va: number;
  watts: number;
  topology: "line-interactive" | "online-double-conversion";
  rackU: number;
  runtimeMin: number;
  extBattery: boolean;
  outlets: number;
  volts: number;
}

export const UPSES: UpsFamily[] = [
  { key: "apc-srt10k", brand: "APC", name: "Smart-UPS SRT 10kVA", segment: "datacenter", year: 2019, usd: 7800, va: 10000, watts: 10000, topology: "online-double-conversion", rackU: 6, runtimeMin: 8, extBattery: true, outlets: 12, volts: 230, conditions: ["new", "refurb-a"], highlights: ["True double conversion — clean sine wave regardless of what the grid does", "Unity power factor: 10kVA is 10kW", "Essential given Pakistani grid behaviour"], tags: ["online", "rack", "230v", "high-power"] },
  { key: "apc-smt3000", brand: "APC", name: "Smart-UPS SMT3000RMI2U", segment: "workstation", year: 2018, usd: 1900, va: 3000, watts: 2700, topology: "line-interactive", rackU: 2, runtimeMin: 10, extBattery: true, outlets: 8, volts: 230, conditions: ["new", "refurb-a", "pull"], highlights: ["2U, 2700W — covers one workstation or a small node", "Line-interactive with AVR for sag correction", "Battery packs are user-replaceable"], tags: ["line-interactive", "rack", "230v"] },
  { key: "vertiv-gxt5-6k", brand: "Vertiv", name: "Liebert GXT5 6kVA", segment: "datacenter", year: 2021, usd: 4200, va: 6000, watts: 6000, topology: "online-double-conversion", rackU: 5, runtimeMin: 7, extBattery: true, outlets: 10, volts: 230, conditions: ["new", "refurb-a"], highlights: ["Online topology in 5U", "Handles generator transfer without dropping the load", "External battery cabinets extend runtime to hours"], tags: ["online", "rack", "230v", "generator"] },
];

/* ========================================================= System families */

export interface SystemFamily extends FamilyBase {
  category: "ai-workstation" | "gpu-server" | "hpc-node" | "cluster" | "ai-rig" | "storage-node";
  rackU: number;
  nodes: number;
  cpuModel: string;
  cpuSockets: number;
  coresTotal: number;
  gpuModel: string | null;
  gpuCount: number;
  memGb: number;
  memGen: MemGen;
  storage: string;
  fabric: string;
  peakW: number;
  bf16: number;
  stack: string[];
  burnIn: number;
}

export const SYSTEMS: SystemFamily[] = [
  { key: "sys-hgx-h100", brand: "SUPERCOMPUTERS", name: "TF-8H100 HGX Node", segment: "datacenter", year: 2024, usd: 260000, category: "gpu-server", rackU: 8, nodes: 1, cpuModel: "2x Intel Xeon Platinum 8480+", cpuSockets: 2, coresTotal: 112, gpuModel: "NVIDIA H100 SXM5 80GB", gpuCount: 8, memGb: 2048, memGen: "ddr5", storage: "8x 7.68TB U.2 NVMe", fabric: "8x ConnectX-7 NDR400 + 2x 100GbE", peakW: 10200, bf16: 7912, stack: ["Ubuntu 22.04 LTS", "NVIDIA driver + CUDA 12", "NVIDIA Container Toolkit", "Slurm", "NCCL tuned"], burnIn: 72, conditions: ["new", "refurb-a"], highlights: ["8-way NVLink all-to-all, 900 GB/s per GPU", "Delivered racked, cabled and burned in for 72 hours", "10.2kW peak — three-phase and real cooling are prerequisites, not options"], tags: ["hgx", "nvlink", "training", "flagship", "high-power"] },
  { key: "sys-8xl40s", brand: "SUPERCOMPUTERS", name: "TF-8L40S Inference Node", segment: "datacenter", year: 2024, usd: 96000, category: "gpu-server", rackU: 4, nodes: 1, cpuModel: "2x AMD EPYC 9354", cpuSockets: 2, coresTotal: 64, gpuModel: "NVIDIA L40S 48GB", gpuCount: 8, memGb: 1024, memGen: "ddr5", storage: "10x 3.84TB U.2 NVMe", fabric: "2x ConnectX-6 HDR200 + 2x 25GbE", peakW: 4800, bf16: 2896, stack: ["Ubuntu 22.04 LTS", "CUDA 12", "vLLM", "Triton Inference Server", "Prometheus + Grafana"], burnIn: 48, conditions: ["new", "refurb-a"], highlights: ["384GB of GDDR6 ECC across eight cards", "Air-cooled in 4U — no facility water needed", "The sensible first production inference box"], tags: ["gpu-dense", "inference", "air-cooled", "vllm"] },
  { key: "sys-4xa100", brand: "SUPERCOMPUTERS", name: "TF-4A100 Refurb Trainer", segment: "datacenter", year: 2023, usd: 48000, category: "gpu-server", rackU: 4, nodes: 1, cpuModel: "2x AMD EPYC 7543", cpuSockets: 2, coresTotal: 64, gpuModel: "NVIDIA A100 PCIe 80GB", gpuCount: 4, memGb: 512, memGen: "ddr4", storage: "4x 3.84TB U.2 NVMe", fabric: "1x ConnectX-6 HDR200", peakW: 2600, bf16: 1248, stack: ["Ubuntu 22.04 LTS", "CUDA 12", "PyTorch 2", "Slurm", "NCCL tuned"], burnIn: 48, conditions: ["refurb-a", "refurb-b"], highlights: ["320GB HBM2e for well under half the price of a new node", "Every GPU load-tested 48 hours before it ships", "The best PKR-per-training-hour we sell"], tags: ["training", "value", "refurb", "hbm"] },
  { key: "sys-ws-4x6000ada", brand: "SUPERCOMPUTERS", name: "TF-W4 AI Workstation", segment: "workstation", year: 2024, usd: 34000, category: "ai-workstation", rackU: 0, nodes: 1, cpuModel: "AMD Threadripper PRO 7975WX", cpuSockets: 1, coresTotal: 32, gpuModel: "NVIDIA RTX 6000 Ada 48GB", gpuCount: 4, memGb: 512, memGen: "ddr5", storage: "2x 4TB M.2 NVMe + 2x 7.68TB U.2", fabric: "2x 10GbE onboard", peakW: 2100, bf16: 1456, stack: ["Ubuntu 24.04 LTS", "CUDA 12", "PyTorch 2", "Docker", "JupyterLab"], burnIn: 24, conditions: ["new"], highlights: ["192GB of ECC VRAM under a desk, on a single 230V circuit", "Blower cards so all four stay under 84C in a closed case", "Runs on ordinary office power — no rack, no three-phase"], tags: ["workstation", "ecc", "desk-side", "training"] },
  { key: "sys-ws-2x5090", brand: "SUPERCOMPUTERS", name: "TF-W2 Creator Rig", segment: "workstation", year: 2025, usd: 11000, category: "ai-rig", rackU: 0, nodes: 1, cpuModel: "AMD Ryzen 9 9950X", cpuSockets: 1, coresTotal: 16, gpuModel: "NVIDIA GeForce RTX 5090 32GB", gpuCount: 2, memGb: 192, memGen: "ddr5", storage: "2x 4TB M.2 NVMe", fabric: "1x 2.5GbE onboard", peakW: 1700, bf16: 418, stack: ["Ubuntu 24.04 LTS", "CUDA 12", "ComfyUI", "Ollama", "PyTorch 2"], burnIn: 24, conditions: ["new"], highlights: ["64GB of GDDR7 for local model work and rendering", "1700W peak — needs a dedicated 15A circuit, not a shared board", "Consumer cards: no ECC, no NVLink, but the price reflects that"], tags: ["rig", "local-llm", "render", "desk-side"] },
  { key: "sys-cluster-16", brand: "SUPERCOMPUTERS", name: "TF-C16 CPU Cluster", segment: "datacenter", year: 2024, usd: 145000, category: "cluster", rackU: 32, nodes: 16, cpuModel: "2x AMD EPYC 9654 per node", cpuSockets: 32, coresTotal: 3072, gpuModel: null, gpuCount: 0, memGb: 12288, memGen: "ddr5", storage: "16x 7.68TB U.2 NVMe + 200TB shared", fabric: "HDR200 InfiniBand fat-tree, QM8700 spine", peakW: 22000, bf16: 0, stack: ["Rocky Linux 9", "Slurm", "OpenMPI", "Lustre client", "Warewulf provisioning"], burnIn: 96, conditions: ["new", "refurb-a"], highlights: ["3072 cores and 12TB of RAM across sixteen nodes", "Non-blocking HDR200 fat-tree, cabled and validated on site", "Delivered as two racks: compute plus storage and head"], tags: ["cluster", "hpc", "infiniband", "cfd", "turnkey"] },
  { key: "sys-storage-2u", brand: "SUPERCOMPUTERS", name: "TF-S24 NVMe Storage Node", segment: "datacenter", year: 2024, usd: 62000, category: "storage-node", rackU: 2, nodes: 1, cpuModel: "2x AMD EPYC 9354", cpuSockets: 2, coresTotal: 64, gpuModel: null, gpuCount: 0, memGb: 512, memGen: "ddr5", storage: "24x 15.36TB U.2 NVMe (368TB raw)", fabric: "2x ConnectX-6 HDR200", peakW: 1800, bf16: 0, stack: ["Ubuntu 22.04 LTS", "ZFS 2.2", "NFS over RDMA", "MinIO S3 gateway"], burnIn: 72, conditions: ["new", "refurb-a"], highlights: ["368TB raw NVMe in 2U", "NFS over RDMA keeps training GPUs fed", "ZFS with dual-parity and hot spares configured before dispatch"], tags: ["storage", "nvme", "zfs", "dataset"] },
  { key: "sys-hpc-node", brand: "SUPERCOMPUTERS", name: "TF-N2 Compute Node", segment: "datacenter", year: 2024, usd: 14500, category: "hpc-node", rackU: 1, nodes: 1, cpuModel: "2x AMD EPYC 9354", cpuSockets: 2, coresTotal: 64, gpuModel: null, gpuCount: 0, memGb: 768, memGen: "ddr5", storage: "2x 1.92TB U.2 NVMe", fabric: "1x ConnectX-6 HDR200", peakW: 900, bf16: 0, stack: ["Rocky Linux 9", "Slurm client", "OpenMPI", "Warewulf stateless boot"], burnIn: 48, conditions: ["new", "refurb-a"], highlights: ["64 cores and 768GB in 1U", "Stateless boot — add nodes without touching a disk", "The unit of growth for a Slurm cluster"], tags: ["hpc", "1u", "cluster-node", "cfd"] },
];
