/**
 * Catalog schema.
 *
 * Every field here exists because the compatibility engine, the 3D layout or
 * the quotation reads it. If a spec is decorative it belongs in `highlights`,
 * not in the typed body, that keeps `src/lib/compat` honest about what it can
 * actually check.
 */

export type Kind =
  | "gpu"
  | "cpu"
  | "motherboard"
  | "memory"
  | "storage"
  | "psu"
  | "chassis"
  | "cooler"
  | "nic"
  | "switch"
  | "optic"
  | "rack"
  | "pdu"
  | "ups"
  | "system";

export type Condition =
  | "new"
  | "refurb-a" // fully tested, cosmetically near-new, 12mo warranty
  | "refurb-b" // fully tested, visible wear, 6mo warranty
  | "recertified" // OEM-recertified with original serial intact
  | "open-box"
  | "pull"; // working pull from a decommissioned system, tested, 90d

export type Segment = "datacenter" | "workstation" | "desktop" | "edge";

/** Physical PCIe slot width, in x1/x4/x8/x16 mechanical terms. */
export type PcieWidth = 1 | 4 | 8 | 16;
/** Gen 2 is included deliberately, plenty of viable used NICs are PCIe 2.0. */
export type PcieGen = 2 | 3 | 4 | 5 | 6;

export type MoboForm =
  | "atx"
  | "matx"
  | "itx"
  | "eatx"
  | "ssi-eeb"
  | "ssi-ceb"
  | "proprietary";

export type ChassisForm =
  | "mid-tower"
  | "full-tower"
  | "super-tower"
  | "1u"
  | "2u"
  | "3u"
  | "4u"
  | "5u"
  | "open-frame";

export type PsuForm = "atx" | "sfx" | "sfx-l" | "crps" | "redundant-1u" | "redundant-2u";

export type MemKind = "udimm" | "so-dimm" | "rdimm" | "lrdimm" | "mrdimm";
export type MemGen = "ddr4" | "ddr5";

export type StorageBus = "sata" | "sas3" | "sas4" | "m2-nvme" | "u2" | "u3" | "e1s" | "e3s";

export type PowerConnector =
  | "eps-8"      // CPU 12V, 8-pin
  | "pcie-6"
  | "pcie-8"
  | "12vhpwr"    // 12+4 pin, 600W class
  | "12v2x6"     // revised 12VHPWR
  | "sata-power"
  | "molex";

export type PortType =
  | "rj45"
  | "sfp+"    // 10G
  | "sfp28"   // 25G
  | "qsfp+"   // 40G
  | "qsfp28"  // 100G
  | "qsfp56"  // 200G / HDR IB
  | "qsfp-dd" // 400G
  | "osfp";   // 400/800G / NDR IB

export type Fabric = "ethernet" | "infiniband" | "both";

export type Severity = "error" | "warn" | "info" | "gain";

/** What the storefront knows about getting one into a customer's hands. */
export interface Availability {
  /** Units physically in our own Lahore/Karachi stock. 0 means we source it. */
  inHouse: number;
  /** Working days from order to dispatch when sourced externally. */
  leadDays: number;
  /** We can get it, but only against a confirmed order + advance. */
  indentOnly: boolean;
}

export interface Money {
  /** Pakistani rupees, inclusive of import duty and GST as landed. */
  pkr: number;
  /** Set when the line is quote-only (clusters, NDR fabric, HGX baseboards). */
  onRequest?: boolean;
}

interface Base {
  id: string;
  /** First verified photograph, when one has been imported. */
  imageId?: number;
  slug: string;
  kind: Kind;
  brand: string;
  /** Marketing model name, e.g. "GeForce RTX 5090 GAMING OC". */
  model: string;
  /** Vendor part number where a real one is known; else our internal SKU. */
  mpn: string;
  condition: Condition;
  segment: Segment;
  price: Money;
  avail: Availability;
  warrantyMonths: number;
  releaseYear: number;
  /** Free-text selling points. Never read by the compat engine. */
  highlights: string[];
  /** Facet tags for browse: "nvlink", "liquid", "gpu-dense", ... */
  tags: string[];
  /** Family id this SKU was expanded from, groups variants together. */
  family: string;
  /**
   * The part as it would be listed on a supplier's price list: no condition
   * grade, no board-partner tier, no internal SKU. Used for catalog search and
   * for matching against inbound supplier stock lists.
   */
  searchKey: string;
}

/* ---------------------------------------------------------------- compute */

export interface Gpu extends Base {
  kind: "gpu";
  arch: string;
  vramGb: number;
  vramType: "gddr6" | "gddr6x" | "gddr7" | "hbm2e" | "hbm3" | "hbm3e";
  memBusBits: number;
  memBandwidthGbs: number;
  fp32Tflops: number;
  /** Dense BF16/FP16 tensor throughput. Sparse figures are marketing. */
  bf16Tflops: number;
  fp8Tflops?: number;
  tdpW: number;
  /** "pcie" cards drop into slots; "sxm"/"oam" need a vendor baseboard. */
  formFactor: "pcie" | "sxm" | "oam";
  slotsWide: number;
  lengthMm: number;
  pcieGen: PcieGen;
  pcieWidth: PcieWidth;
  connectors: PowerConnector[];
  /** Recommended PSU for a single-card build, vendor figure. */
  psuRecW: number;
  nvlink: boolean;
  /** Blower/passive cards survive 2U rackmount; axial cards do not. */
  cooling: "axial" | "blower" | "passive" | "liquid";
  displayOutputs: number;
  eccVram: boolean;
  mig: boolean;
  vgpuLicensable: boolean;
}

export interface Cpu extends Base {
  kind: "cpu";
  socket: string;
  arch: string;
  cores: number;
  threads: number;
  baseGhz: number;
  boostGhz: number;
  l3Mb: number;
  tdpW: number;
  /** Peak sustained power, which is what actually sizes the PSU. */
  maxPowerW: number;
  memGen: MemGen;
  memChannels: number;
  memKinds: MemKind[];
  maxMemGb: number;
  memMaxMts: number;
  eccSupport: boolean;
  pcieGen: PcieGen;
  pcieLanes: number;
  /** 1 = single-socket only, 2 = 2P capable, 4 = 4P. */
  maxSockets: number;
  integratedGraphics: boolean;
  /** Some server SKUs ship without a bundled heatsink. */
  coolerIncluded: boolean;
  avx512: boolean;
  amx: boolean;
}

/* --------------------------------------------------------------- platform */

export interface PcieSlot {
  gen: PcieGen;
  /** Mechanical connector size. */
  width: PcieWidth;
  /** Lanes actually wired, an x16 slot wired x4 is a classic trap. */
  lanes: PcieWidth;
  /** Slot positions consumed before the next usable slot. */
  spacing: number;
}

export interface Motherboard extends Base {
  kind: "motherboard";
  socket: string;
  sockets: number;
  chipset: string;
  form: MoboForm;
  memGen: MemGen;
  memSlots: number;
  memKinds: MemKind[];
  maxMemGb: number;
  memMaxMts: number;
  eccSupport: boolean;
  pcieSlots: PcieSlot[];
  m2Slots: number;
  m2MaxGen: PcieGen;
  sataPorts: number;
  u2Ports: number;
  /** 8-pin EPS headers present. Big CPUs want two. */
  epsHeaders: number;
  onboardNicGbps: number;
  onboardNicPorts: number;
  ipmi: boolean;
  /** CPU cooler height budget is a chassis property, not a board one. */
  vrmPhases: number;
  biosFlashback: boolean;
}

export interface Memory extends Base {
  kind: "memory";
  memGen: MemGen;
  memKind: MemKind;
  /** Capacity of ONE module. */
  moduleGb: number;
  modules: number;
  mts: number;
  casLatency: number;
  ecc: boolean;
  ranks: string; // "1Rx8", "2Rx4", ...
  voltage: number;
  heightMm: number;
  /** Registered/load-reduced parts will not post in a UDIMM-only board. */
  registered: boolean;
}

export interface Storage extends Base {
  kind: "storage";
  bus: StorageBus;
  capacityGb: number;
  media: "nvme-tlc" | "nvme-qlc" | "nvme-slc" | "sata-tlc" | "hdd-cmr" | "hdd-smr";
  readMbs: number;
  writeMbs: number;
  readIops: number;
  writeIops: number;
  /** Drive writes per day over the warranty term. */
  dwpd: number;
  pcieGen?: PcieGen;
  pcieWidth?: PcieWidth;
  /** "2280" for M.2, "2.5in-15mm" for U.2, "3.5in" for HDD. */
  physical: string;
  powerLossProtection: boolean;
  tdpW: number;
}

/* ---------------------------------------------------------- power/thermal */

export interface Psu extends Base {
  kind: "psu";
  wattage: number;
  form: PsuForm;
  efficiency: "80+ bronze" | "80+ gold" | "80+ platinum" | "80+ titanium";
  atxSpec: "2.4" | "3.0" | "3.1";
  modular: "full" | "semi" | "none";
  connectors: Partial<Record<PowerConnector, number>>;
  /** Redundant CRPS units: 1+1, 2+2. 1 means non-redundant. */
  redundancy: number;
  /** Pakistan runs 230V/50Hz; some CRPS units need 200V+ for full output. */
  inputVoltsMin: number;
  derated230V: number;
  depthMm: number;
  fanless: boolean;
}

export interface Cooler extends Base {
  kind: "cooler";
  type: "air-tower" | "air-low" | "aio" | "passive-1u" | "passive-2u" | "coldplate";
  sockets: string[];
  /** Vendor-rated heat dissipation. Treat as optimistic. */
  tdpRatingW: number;
  heightMm: number;
  /** AIO radiator size, mm. 0 for air. */
  radiatorMm: number;
  /** Rack heatsinks only move air if the chassis provides static pressure. */
  needsChassisAirflow: boolean;
  noiseDba: number;
}

export interface Chassis extends Base {
  kind: "chassis";
  form: ChassisForm;
  /** Rack units consumed. 0 for towers. */
  rackU: number;
  moboForms: MoboForm[];
  psuForms: PsuForm[];
  maxGpuLengthMm: number;
  maxCoolerHeightMm: number;
  maxRadiatorMm: number;
  /** Usable full-height expansion slots at the rear. */
  expansionSlots: number;
  bays35: number;
  bays25: number;
  hotSwapBays: number;
  /** U.2/U.3/SATA determines which drives the backplane will actually accept. */
  backplane: StorageBus | "none";
  /** Front-to-back forced airflow, required by passive datacenter GPUs. */
  forcedAirflow: boolean;
  maxGpus: number;
  depthMm: number;
  weightKg: number;
}

/* ----------------------------------------------------------------- fabric */

export interface Nic extends Base {
  kind: "nic";
  fabric: Fabric;
  portGbps: number;
  ports: number;
  portType: PortType;
  pcieGen: PcieGen;
  pcieWidth: PcieWidth;
  tdpW: number;
  rdma: boolean;
  sriov: boolean;
  /** GPUDirect RDMA, the reason you buy ConnectX for an AI node. */
  gpuDirect: boolean;
  lowProfile: boolean;
}

export interface Switch extends Base {
  kind: "switch";
  fabric: Fabric;
  ports: number;
  portGbps: number;
  portType: PortType;
  rackU: number;
  switchingTbps: number;
  tdpW: number;
  managed: boolean;
  airflow: "front-to-back" | "back-to-front" | "reversible";
  psuRedundant: boolean;
}

export interface Optic extends Base {
  kind: "optic";
  /** DAC/AOC are cables; the rest are pluggable modules. */
  media: "dac-passive" | "dac-active" | "aoc" | "sr" | "lr" | "fr" | "dr";
  portType: PortType;
  gbps: number;
  lengthM: number;
  reachM: number;
  /** Coded for a vendor's switch, a Mellanox-coded optic sulks in a Cisco. */
  codedFor: string;
  fabric: Fabric;
  powerW: number;
}

/* -------------------------------------------------------------- facility */

export interface Rack extends Base {
  kind: "rack";
  heightU: number;
  widthMm: number;
  depthMm: number;
  staticLoadKg: number;
  /** Perforation percentage, under 60% chokes dense GPU nodes. */
  perforationPct: number;
  includedPduSlots: number;
  shielded: boolean;
}

export interface Pdu extends Base {
  kind: "pdu";
  outlets: number;
  outletType: string;
  phases: 1 | 3;
  inputAmps: number;
  maxKw: number;
  metered: boolean;
  switched: boolean;
  rackU: number;
  voltage: number;
}

export interface Ups extends Base {
  kind: "ups";
  vaRating: number;
  wattage: number;
  topology: "line-interactive" | "online-double-conversion";
  rackU: number;
  /** Minutes at half load with internal batteries. */
  runtimeHalfLoadMin: number;
  externalBatterySupport: boolean;
  outlets: number;
  inputVolts: number;
}

/* ---------------------------------------------------------------- systems */

/** A pre-built node or cluster. Sold assembled, burn-in tested, racked. */
export interface System extends Base {
  kind: "system";
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
  storageSummary: string;
  fabricSummary: string;
  peakPowerW: number;
  /** Aggregate dense BF16 across all accelerators. */
  bf16Tflops: number;
  /** Pre-loaded stack: Ubuntu + CUDA + Slurm, etc. */
  softwareStack: string[];
  burnInHours: number;
}

export type Product =
  | Gpu
  | Cpu
  | Motherboard
  | Memory
  | Storage
  | Psu
  | Cooler
  | Chassis
  | Nic
  | Switch
  | Optic
  | Rack
  | Pdu
  | Ups
  | System;

/** Narrowing helper so call sites stop writing `as Gpu` everywhere. */
export function isKind<K extends Kind>(p: Product, k: K): p is Extract<Product, { kind: K }> {
  return p.kind === k;
}

export const KIND_LABEL: Record<Kind, string> = {
  gpu: "Graphics & Accelerators",
  cpu: "Processors",
  motherboard: "Motherboards",
  memory: "Memory",
  storage: "Storage",
  psu: "Power Supplies",
  cooler: "Cooling",
  chassis: "Chassis & Enclosures",
  nic: "Network Adapters",
  switch: "Switches",
  optic: "Optics & Cables",
  rack: "Racks",
  pdu: "Power Distribution",
  ups: "UPS",
  system: "Systems",
};

export const CONDITION_LABEL: Record<Condition, string> = {
  new: "New / Sealed",
  "refurb-a": "Refurbished Grade A",
  "refurb-b": "Refurbished Grade B",
  recertified: "OEM Recertified",
  "open-box": "Open Box",
  pull: "Tested Pull",
};

export const CONDITION_NOTE: Record<Condition, string> = {
  new: "Factory sealed, full manufacturer warranty where the vendor honours it in Pakistan.",
  "refurb-a": "Bench tested under load for 48 hours. Cosmetically near-new. Covered in-house.",
  "refurb-b": "Bench tested under load for 48 hours. Visible cosmetic wear, no functional impact.",
  recertified: "Returned to the OEM, re-certified, original serial and service tag intact.",
  "open-box": "Customer return, unused, packaging opened. Full function test on receipt.",
  pull: "Pulled working from a decommissioned system, cleaned, re-pasted and load tested.",
};
