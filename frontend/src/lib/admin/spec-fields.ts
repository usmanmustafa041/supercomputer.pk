/**
 * What to ask for, per category.
 *
 * A graphics card needs memory size and card length. A power supply needs watts
 * and a count of each cable. There is no single set of fields that suits both,
 * which is why the database keeps these in a flexible column. That is a fine
 * way to store them and a terrible way to type them in, so this file turns each
 * category into an ordinary form: real labels, real units, dropdowns instead of
 * remembered spellings.
 *
 * Add a field here and it appears in the admin form, gets saved with the right
 * type, and shows up on the product page. Nothing else to change.
 *
 * The keys match the property names the compatibility engine reads, so a typo
 * here is a check that silently stops working. Keep them exact.
 */

import type { Kind } from "@supercomputers/shared";

export type Field =
  | { key: string; label: string; type: "text"; hint?: string; placeholder?: string; group?: string }
  | {
      key: string;
      label: string;
      type: "number";
      unit?: string;
      hint?: string;
      min?: number;
      max?: number;
      step?: number;
      group?: string;
    }
  | { key: string; label: string; type: "boolean"; hint?: string; group?: string }
  | {
      key: string;
      label: string;
      type: "select";
      options: ReadonlyArray<readonly [string, string]>;
      hint?: string;
      group?: string;
    }
  | {
      key: string;
      label: string;
      type: "multi";
      options: ReadonlyArray<readonly [string, string]>;
      hint?: string;
      group?: string;
    }
  | {
      /** A count against each option, e.g. how many of each power cable. */
      key: string;
      label: string;
      type: "counts";
      options: ReadonlyArray<readonly [string, string]>;
      hint?: string;
      group?: string;
    }
  | { key: string; label: string; type: "list"; hint?: string; group?: string };

// Shared option lists, so the same words appear everywhere they are offered.

const PCIE_GEN = [
  ["2", "PCIe 2.0"],
  ["3", "PCIe 3.0"],
  ["4", "PCIe 4.0"],
  ["5", "PCIe 5.0"],
  ["6", "PCIe 6.0"],
] as const;

const PCIE_WIDTH = [
  ["1", "x1"],
  ["4", "x4"],
  ["8", "x8"],
  ["16", "x16"],
] as const;

const POWER_CONNECTORS = [
  ["eps-8", "CPU 8-pin (EPS)"],
  ["pcie-6", "PCIe 6-pin"],
  ["pcie-8", "PCIe 8-pin"],
  ["12vhpwr", "12VHPWR (12+4 pin)"],
  ["12v2x6", "12V-2x6 (newer 12VHPWR)"],
  ["sata-power", "SATA power"],
  ["molex", "Molex"],
] as const;

const PORT_TYPES = [
  ["rj45", "RJ45 copper"],
  ["sfp+", "SFP+ (10G)"],
  ["sfp28", "SFP28 (25G)"],
  ["qsfp+", "QSFP+ (40G)"],
  ["qsfp28", "QSFP28 (100G)"],
  ["qsfp56", "QSFP56 (200G)"],
  ["qsfp-dd", "QSFP-DD (400G)"],
  ["osfp", "OSFP (400G and up)"],
] as const;

const FABRIC = [
  ["ethernet", "Ethernet only"],
  ["infiniband", "InfiniBand only"],
  ["both", "Either (VPI)"],
] as const;

const MEM_GEN = [
  ["ddr4", "DDR4"],
  ["ddr5", "DDR5"],
] as const;

const MEM_KINDS = [
  ["udimm", "Desktop (UDIMM)"],
  ["so-dimm", "Laptop (SO-DIMM)"],
  ["rdimm", "Server registered (RDIMM)"],
  ["lrdimm", "Server load-reduced (LRDIMM)"],
  ["mrdimm", "Server multiplexed (MRDIMM)"],
] as const;

const MOBO_FORMS = [
  ["atx", "ATX"],
  ["matx", "Micro-ATX"],
  ["itx", "Mini-ITX"],
  ["eatx", "E-ATX"],
  ["ssi-eeb", "SSI-EEB (server)"],
  ["ssi-ceb", "SSI-CEB (server)"],
  ["proprietary", "Proprietary"],
] as const;

const PSU_FORMS = [
  ["atx", "ATX"],
  ["sfx", "SFX (small)"],
  ["sfx-l", "SFX-L"],
  ["crps", "CRPS (server)"],
  ["redundant-1u", "Redundant 1U"],
  ["redundant-2u", "Redundant 2U"],
] as const;

const STORAGE_BUS = [
  ["sata", "SATA"],
  ["sas3", "SAS 12G"],
  ["sas4", "SAS 24G"],
  ["m2-nvme", "M.2 NVMe"],
  ["u2", "U.2"],
  ["u3", "U.3"],
  ["e1s", "E1.S (ruler)"],
  ["e3s", "E3.S"],
] as const;

/**
 * Fields shown for each category, in the order they should be asked.
 * `group` splits them into headed sections on the form.
 */
export const SPEC_FIELDS: Record<Kind, readonly Field[]> = {
  gpu: [
    { key: "vramGb", label: "Graphics memory", type: "number", unit: "GB", group: "Performance" },
    {
      key: "vramType",
      label: "Memory type",
      type: "select",
      group: "Performance",
      options: [
        ["gddr6", "GDDR6"],
        ["gddr6x", "GDDR6X"],
        ["gddr7", "GDDR7"],
        ["hbm2e", "HBM2e"],
        ["hbm3", "HBM3"],
        ["hbm3e", "HBM3e"],
      ],
    },
    { key: "arch", label: "Architecture", type: "text", group: "Performance", placeholder: "Blackwell" },
    { key: "memBusBits", label: "Memory bus width", type: "number", unit: "bit", group: "Performance" },
    { key: "memBandwidthGbs", label: "Memory bandwidth", type: "number", unit: "GB/s", group: "Performance" },
    { key: "eccVram", label: "Memory has error correction", type: "boolean", group: "Performance" },

    {
      key: "formFactor",
      label: "Card type",
      type: "select",
      group: "Fitting it in",
      hint: "SXM and OAM only come as part of a complete system, not as a card you plug in.",
      options: [
        ["pcie", "Standard PCIe card"],
        ["sxm", "SXM module"],
        ["oam", "OAM module"],
      ],
    },
    { key: "lengthMm", label: "Card length", type: "number", unit: "mm", group: "Fitting it in" },
    {
      key: "slotsWide",
      label: "Slots taken up",
      type: "number",
      unit: "slots",
      min: 1,
      max: 5,
      group: "Fitting it in",
      hint: "How many slot positions the card blocks, including its own.",
    },
    { key: "pcieGen", label: "PCIe generation", type: "select", options: PCIE_GEN, group: "Fitting it in" },
    { key: "pcieWidth", label: "Slot width needed", type: "select", options: PCIE_WIDTH, group: "Fitting it in" },
    {
      key: "cooling",
      label: "How it is cooled",
      type: "select",
      group: "Fitting it in",
      hint: "Passive cards have no fan of their own and need a case that forces air over them.",
      options: [
        ["axial", "Its own fans (normal desktop card)"],
        ["blower", "Blower fan (pushes air out the back)"],
        ["passive", "No fan at all (server card)"],
        ["liquid", "Liquid cooled"],
      ],
    },

    { key: "tdpW", label: "Power it draws", type: "number", unit: "W", group: "Power" },
    { key: "psuRecW", label: "Power supply we recommend", type: "number", unit: "W", group: "Power" },
    {
      key: "connectors",
      label: "Power cables it needs",
      type: "counts",
      options: POWER_CONNECTORS,
      group: "Power",
      hint: "How many of each. Leave at zero for anything it does not use.",
    },

    { key: "displayOutputs", label: "Display outputs", type: "number", group: "Other" },
    { key: "nvlink", label: "Supports NVLink", type: "boolean", group: "Other" },
    { key: "mig", label: "Can be split into smaller GPUs (MIG)", type: "boolean", group: "Other" },
    { key: "vgpuLicensable", label: "Supports vGPU licensing", type: "boolean", group: "Other" },
  ],

  cpu: [
    { key: "socket", label: "Socket", type: "text", group: "Fit", placeholder: "SP5", hint: "Must match the board exactly." },
    { key: "maxSockets", label: "Can work in a machine with up to", type: "number", unit: "processors", min: 1, max: 8, group: "Fit" },
    { key: "arch", label: "Architecture", type: "text", group: "Fit", placeholder: "Zen 4" },

    { key: "cores", label: "Cores", type: "number", group: "Speed" },
    { key: "threads", label: "Threads", type: "number", group: "Speed" },
    { key: "baseGhz", label: "Base speed", type: "number", unit: "GHz", step: 0.1, group: "Speed" },
    { key: "boostGhz", label: "Boost speed", type: "number", unit: "GHz", step: 0.1, group: "Speed" },
    { key: "amx", label: "Has AMX (AI acceleration)", type: "boolean", group: "Speed" },

    { key: "memGen", label: "Memory it takes", type: "select", options: MEM_GEN, group: "Memory" },
    { key: "memKinds", label: "Memory types supported", type: "multi", options: MEM_KINDS, group: "Memory" },
    { key: "memChannels", label: "Memory channels", type: "number", group: "Memory", hint: "Fill all of these evenly or you lose speed." },
    { key: "maxMemGb", label: "Most memory it can address", type: "number", unit: "GB", group: "Memory" },
    { key: "memMaxMts", label: "Fastest memory it runs", type: "number", unit: "MT/s", group: "Memory" },
    { key: "eccSupport", label: "Supports error-correcting memory", type: "boolean", group: "Memory" },

    { key: "tdpW", label: "Rated power", type: "number", unit: "W", group: "Power and cooling" },
    { key: "maxPowerW", label: "Peak power under full load", type: "number", unit: "W", group: "Power and cooling", hint: "Size the cooler against this, not the rated figure." },
    { key: "coolerIncluded", label: "Comes with a cooler in the box", type: "boolean", group: "Power and cooling" },

    { key: "pcieGen", label: "PCIe generation", type: "select", options: PCIE_GEN, group: "Expansion" },
    { key: "pcieLanes", label: "PCIe lanes", type: "number", group: "Expansion" },
    { key: "integratedGraphics", label: "Has built-in graphics", type: "boolean", group: "Expansion" },
  ],

  motherboard: [
    { key: "socket", label: "Socket", type: "text", group: "Fit", placeholder: "SP5" },
    { key: "sockets", label: "Number of processor sockets", type: "number", min: 1, max: 8, group: "Fit" },
    { key: "form", label: "Board size", type: "select", options: MOBO_FORMS, group: "Fit" },
    { key: "chipset", label: "Chipset", type: "text", group: "Fit" },

    { key: "memGen", label: "Memory it takes", type: "select", options: MEM_GEN, group: "Memory" },
    { key: "memSlots", label: "Memory slots", type: "number", group: "Memory" },
    { key: "memKinds", label: "Memory types accepted", type: "multi", options: MEM_KINDS, group: "Memory" },
    { key: "maxMemGb", label: "Most memory it takes", type: "number", unit: "GB", group: "Memory" },
    { key: "memMaxMts", label: "Fastest memory it runs", type: "number", unit: "MT/s", group: "Memory" },
    { key: "eccSupport", label: "Supports error-correcting memory", type: "boolean", group: "Memory" },

    {
      key: "pcieSlots",
      label: "Expansion slots",
      type: "list",
      group: "Expansion",
      hint:
        "One slot per line, as: generation, connector size, lanes actually wired, positions used. " +
        'For example "5, 16, 16, 2" is a PCIe 5.0 x16 slot, fully wired, taking two positions.',
    },
    { key: "sataPorts", label: "SATA ports", type: "number", group: "Expansion" },
    { key: "onboardNicPorts", label: "Built-in network ports", type: "number", group: "Expansion" },
    { key: "onboardNicGbps", label: "Speed of those ports", type: "number", unit: "Gbps", group: "Expansion" },

    { key: "epsHeaders", label: "CPU power sockets on the board", type: "number", group: "Power" },
    { key: "vrmPhases", label: "Power stages (VRM)", type: "number", group: "Power" },
    { key: "ipmi", label: "Has remote management (IPMI)", type: "boolean", group: "Power", hint: "Without it, a failed boot in a rack means someone has to drive there." },
    { key: "biosFlashback", label: "Can update BIOS without a processor", type: "boolean", group: "Power" },
  ],

  memory: [
    { key: "memGen", label: "Generation", type: "select", options: MEM_GEN, group: "What it is" },
    { key: "memKind", label: "Type", type: "select", options: MEM_KINDS, group: "What it is" },
    { key: "moduleGb", label: "Size of each stick", type: "number", unit: "GB", group: "What it is" },
    { key: "modules", label: "Sticks in this kit", type: "number", min: 1, group: "What it is" },

    { key: "mts", label: "Speed", type: "number", unit: "MT/s", group: "Speed" },
    { key: "casLatency", label: "CAS latency", type: "number", group: "Speed" },
    { key: "ranks", label: "Ranks", type: "text", group: "Speed", placeholder: "2Rx8" },

    { key: "ecc", label: "Error correcting", type: "boolean", group: "Other" },
    { key: "registered", label: "Registered (server memory)", type: "boolean", group: "Other" },
    { key: "voltage", label: "Voltage", type: "number", unit: "V", step: 0.05, group: "Other" },
    { key: "heightMm", label: "Height", type: "number", unit: "mm", group: "Other", hint: "Over about 40mm and it fouls a wide air cooler." },
  ],

  storage: [
    { key: "bus", label: "Connection", type: "select", options: STORAGE_BUS, group: "What it is" },
    { key: "capacityGb", label: "Capacity", type: "number", unit: "GB", group: "What it is" },
    {
      key: "media",
      label: "Drive type",
      type: "select",
      group: "What it is",
      options: [
        ["nvme-tlc", "SSD, NVMe TLC"],
        ["nvme-qlc", "SSD, NVMe QLC"],
        ["nvme-slc", "SSD, NVMe SLC"],
        ["sata-tlc", "SSD, SATA TLC"],
        ["hdd-cmr", "Hard disk, CMR"],
        ["hdd-smr", "Hard disk, SMR"],
      ],
    },
    { key: "physical", label: "Physical size", type: "text", group: "What it is", placeholder: "2.5in 15mm" },

    { key: "readMbs", label: "Read speed", type: "number", unit: "MB/s", group: "Speed" },
    { key: "writeMbs", label: "Write speed", type: "number", unit: "MB/s", group: "Speed" },
    { key: "readIops", label: "Read operations per second", type: "number", group: "Speed" },
    { key: "writeIops", label: "Write operations per second", type: "number", group: "Speed" },

    { key: "dwpd", label: "Daily writes it is rated for", type: "number", step: 0.1, group: "Endurance", hint: "Drive writes per day, over the warranty period." },
    { key: "powerLossProtection", label: "Protected against sudden power loss", type: "boolean", group: "Endurance" },
    { key: "tdpW", label: "Power draw", type: "number", unit: "W", group: "Endurance" },

    { key: "pcieGen", label: "PCIe generation", type: "select", options: PCIE_GEN, group: "Endurance" },
    { key: "pcieWidth", label: "PCIe width", type: "select", options: PCIE_WIDTH, group: "Endurance" },
  ],

  psu: [
    { key: "wattage", label: "Power output", type: "number", unit: "W", group: "Output" },
    { key: "form", label: "Size and shape", type: "select", options: PSU_FORMS, group: "Output" },
    {
      key: "efficiency",
      label: "Efficiency rating",
      type: "select",
      group: "Output",
      options: [
        ["80+ bronze", "80 Plus Bronze"],
        ["80+ gold", "80 Plus Gold"],
        ["80+ platinum", "80 Plus Platinum"],
        ["80+ titanium", "80 Plus Titanium"],
      ],
    },
    {
      key: "atxSpec",
      label: "ATX standard",
      type: "select",
      group: "Output",
      hint: "Anything below 3.0 can trip when feeding a modern 12VHPWR card.",
      options: [
        ["2.4", "ATX 2.4 (older)"],
        ["3.0", "ATX 3.0"],
        ["3.1", "ATX 3.1"],
      ],
    },

    {
      key: "connectors",
      label: "Cables it comes with",
      type: "counts",
      options: POWER_CONNECTORS,
      group: "Cables",
      hint: "How many of each. This is what we check a build's cards against.",
    },
    {
      key: "modular",
      label: "Cables detachable",
      type: "select",
      group: "Cables",
      options: [
        ["full", "Fully detachable"],
        ["semi", "Partly detachable"],
        ["none", "Fixed"],
      ],
    },

    { key: "redundancy", label: "Redundant units", type: "number", min: 0, group: "Other", hint: "How many spare supplies. Zero means a single unit with no backup." },
    { key: "inputVoltsMin", label: "Lowest input voltage", type: "number", unit: "V", group: "Other" },
    { key: "depthMm", label: "Depth", type: "number", unit: "mm", group: "Other" },
    { key: "fanless", label: "Fanless", type: "boolean", group: "Other" },
  ],

  cooler: [
    {
      key: "type",
      label: "Cooler type",
      type: "select",
      group: "What it is",
      options: [
        ["air-tower", "Air, tall tower"],
        ["air-low", "Air, low profile"],
        ["aio", "Liquid, all in one"],
        ["passive-1u", "Passive, 1U server"],
        ["passive-2u", "Passive, 2U server"],
        ["coldplate", "Cold plate, direct liquid"],
      ],
    },
    { key: "sockets", label: "Sockets it fits", type: "list", group: "What it is", hint: "One socket per line, for example SP5 or LGA4677." },
    { key: "tdpRatingW", label: "Heat it can handle", type: "number", unit: "W", group: "What it is" },

    { key: "heightMm", label: "Height", type: "number", unit: "mm", group: "Fitting it in" },
    { key: "radiatorMm", label: "Radiator size", type: "number", unit: "mm", group: "Fitting it in", hint: "Zero for air coolers." },
    {
      key: "needsChassisAirflow",
      label: "Needs the case to push air over it",
      type: "boolean",
      group: "Fitting it in",
      hint: "True for server heatsinks, which have no fan of their own.",
    },
    { key: "noiseDba", label: "Noise", type: "number", unit: "dBA", group: "Fitting it in" },
  ],

  chassis: [
    {
      key: "form",
      label: "Case type",
      type: "select",
      group: "What it is",
      options: [
        ["mid-tower", "Mid tower"],
        ["full-tower", "Full tower"],
        ["super-tower", "Super tower"],
        ["1u", "1U rack"],
        ["2u", "2U rack"],
        ["3u", "3U rack"],
        ["4u", "4U rack"],
        ["5u", "5U rack"],
        ["open-frame", "Open frame"],
      ],
    },
    { key: "rackU", label: "Rack height", type: "number", unit: "U", group: "What it is", hint: "Zero for a tower or open frame." },
    { key: "moboForms", label: "Board sizes it takes", type: "multi", options: MOBO_FORMS, group: "What it is" },
    { key: "psuForms", label: "Power supply types it takes", type: "multi", options: PSU_FORMS, group: "What it is" },

    { key: "maxGpuLengthMm", label: "Longest card it takes", type: "number", unit: "mm", group: "Space inside" },
    { key: "maxCoolerHeightMm", label: "Tallest cooler it takes", type: "number", unit: "mm", group: "Space inside" },
    { key: "maxRadiatorMm", label: "Largest radiator it takes", type: "number", unit: "mm", group: "Space inside" },
    { key: "expansionSlots", label: "Expansion slot openings", type: "number", group: "Space inside" },
    { key: "maxGpus", label: "Most cards it holds", type: "number", group: "Space inside" },

    { key: "hotSwapBays", label: "Hot-swap drive bays", type: "number", group: "Drives and air" },
    { key: "backplane", label: "Drive types the bays accept", type: "select", options: [...STORAGE_BUS, ["none", "No backplane"]] as const, group: "Drives and air" },
    {
      key: "forcedAirflow",
      label: "Pushes air front to back",
      type: "boolean",
      group: "Drives and air",
      hint: "Needed by any card without its own fan.",
    },
    { key: "depthMm", label: "Depth", type: "number", unit: "mm", group: "Drives and air" },
    { key: "weightKg", label: "Weight", type: "number", unit: "kg", step: 0.1, group: "Drives and air" },
  ],

  nic: [
    { key: "fabric", label: "Network type", type: "select", options: FABRIC, group: "Network" },
    { key: "ports", label: "Ports", type: "number", group: "Network" },
    { key: "portGbps", label: "Speed per port", type: "number", unit: "Gbps", group: "Network" },
    { key: "portType", label: "Connector", type: "select", options: PORT_TYPES, group: "Network" },

    { key: "pcieGen", label: "PCIe generation", type: "select", options: PCIE_GEN, group: "Fitting it in" },
    { key: "pcieWidth", label: "Slot width needed", type: "select", options: PCIE_WIDTH, group: "Fitting it in" },
    { key: "lowProfile", label: "Low profile bracket available", type: "boolean", group: "Fitting it in" },
    { key: "tdpW", label: "Power draw", type: "number", unit: "W", group: "Fitting it in" },

    { key: "rdma", label: "Supports RDMA", type: "boolean", group: "Features" },
    { key: "sriov", label: "Supports SR-IOV", type: "boolean", group: "Features" },
    { key: "gpuDirect", label: "Supports GPUDirect", type: "boolean", group: "Features", hint: "Lets cards talk to the network without going through the processor." },
  ],

  switch: [
    { key: "fabric", label: "Network type", type: "select", options: FABRIC, group: "Network" },
    { key: "ports", label: "Ports", type: "number", group: "Network" },
    { key: "portGbps", label: "Speed per port", type: "number", unit: "Gbps", group: "Network" },
    { key: "portType", label: "Connector", type: "select", options: PORT_TYPES, group: "Network" },
    { key: "switchingTbps", label: "Total throughput", type: "number", unit: "Tbps", step: 0.1, group: "Network" },

    { key: "rackU", label: "Rack height", type: "number", unit: "U", group: "In the rack" },
    { key: "tdpW", label: "Power draw", type: "number", unit: "W", group: "In the rack" },
    {
      key: "airflow",
      label: "Airflow direction",
      type: "select",
      group: "In the rack",
      options: [
        ["front-to-back", "Front to back"],
        ["back-to-front", "Back to front"],
        ["reversible", "Either way"],
      ],
    },
    { key: "managed", label: "Managed", type: "boolean", group: "In the rack" },
    { key: "psuRedundant", label: "Two power supplies", type: "boolean", group: "In the rack" },
  ],

  optic: [
    {
      key: "media",
      label: "Cable or module type",
      type: "select",
      group: "What it is",
      options: [
        ["dac-passive", "Direct attach copper, passive"],
        ["dac-active", "Direct attach copper, active"],
        ["aoc", "Active optical cable"],
        ["sr", "Short range optic"],
        ["lr", "Long range optic"],
        ["fr", "FR optic"],
        ["dr", "DR optic"],
      ],
    },
    { key: "portType", label: "Connector", type: "select", options: PORT_TYPES, group: "What it is" },
    { key: "gbps", label: "Speed", type: "number", unit: "Gbps", group: "What it is" },
    { key: "fabric", label: "Network type", type: "select", options: FABRIC, group: "What it is" },

    { key: "lengthM", label: "Cable length", type: "number", unit: "m", step: 0.5, group: "Reach" },
    { key: "reachM", label: "Maximum reach", type: "number", unit: "m", group: "Reach" },
    { key: "powerW", label: "Power draw", type: "number", unit: "W", step: 0.1, group: "Reach" },
    {
      key: "codedFor",
      label: "Locked to which brand",
      type: "text",
      group: "Reach",
      placeholder: "generic",
      hint: 'Most switches refuse a cable coded for another brand. Put "generic" if it is unlocked.',
    },
  ],

  rack: [
    { key: "heightU", label: "Height", type: "number", unit: "U", group: "Size" },
    { key: "widthMm", label: "Width", type: "number", unit: "mm", group: "Size" },
    { key: "depthMm", label: "Depth", type: "number", unit: "mm", group: "Size", hint: "Leave about 150mm behind the equipment for cables." },
    { key: "staticLoadKg", label: "Weight it holds", type: "number", unit: "kg", group: "Size" },

    { key: "perforationPct", label: "Door open area", type: "number", unit: "%", group: "Air and power", hint: "Below about 60% and dense machines start to cook." },
    { key: "includedPduSlots", label: "Power strip mounts included", type: "number", group: "Air and power" },
    { key: "shielded", label: "Shielded", type: "boolean", group: "Air and power" },
  ],

  pdu: [
    { key: "outlets", label: "Outlets", type: "number", group: "Output" },
    { key: "outletType", label: "Outlet type", type: "text", group: "Output", placeholder: "C13" },
    { key: "voltage", label: "Voltage", type: "number", unit: "V", group: "Output" },

    {
      key: "phases",
      label: "Supply type",
      type: "select",
      group: "Input",
      options: [
        ["1", "Single phase"],
        ["3", "Three phase"],
      ],
      hint: "Past about 7.4kW you need three phase.",
    },
    { key: "inputAmps", label: "Input current", type: "number", unit: "A", group: "Input" },
    { key: "maxKw", label: "Maximum load", type: "number", unit: "kW", step: 0.1, group: "Input" },
    { key: "rackU", label: "Rack height", type: "number", unit: "U", group: "Input", hint: "Zero if it mounts vertically at the back." },

    { key: "metered", label: "Shows power usage", type: "boolean", group: "Features" },
    { key: "switched", label: "Outlets can be switched remotely", type: "boolean", group: "Features" },
  ],

  ups: [
    { key: "vaRating", label: "Rating", type: "number", unit: "VA", group: "Capacity" },
    { key: "wattage", label: "Real output", type: "number", unit: "W", group: "Capacity" },
    { key: "runtimeHalfLoadMin", label: "Runtime at half load", type: "number", unit: "min", group: "Capacity" },
    { key: "externalBatterySupport", label: "Takes extra battery packs", type: "boolean", group: "Capacity" },

    {
      key: "topology",
      label: "Type",
      type: "select",
      group: "Type and fit",
      options: [
        ["line-interactive", "Line interactive (cheaper)"],
        ["online-double-conversion", "Always on, double conversion"],
      ],
      hint: "Given how the grid behaves here, always-on is the safer choice for anything expensive.",
    },
    { key: "rackU", label: "Rack height", type: "number", unit: "U", group: "Type and fit" },
    { key: "outlets", label: "Outlets", type: "number", group: "Type and fit" },
    { key: "inputVolts", label: "Input voltage", type: "number", unit: "V", group: "Type and fit" },
  ],

  system: [
    { key: "category", label: "System type", type: "text", group: "Overview", placeholder: "gpu-server" },
    { key: "nodes", label: "Machines in this system", type: "number", min: 1, group: "Overview" },
    { key: "rackU", label: "Rack height", type: "number", unit: "U", group: "Overview" },
    { key: "burnInHours", label: "Hours tested before shipping", type: "number", group: "Overview" },

    { key: "cpuModel", label: "Processor", type: "text", group: "What is inside" },
    { key: "coresTotal", label: "Total cores", type: "number", group: "What is inside" },
    { key: "gpuModel", label: "Graphics card", type: "text", group: "What is inside" },
    { key: "gpuCount", label: "Number of cards", type: "number", group: "What is inside" },
    { key: "memGb", label: "Memory", type: "number", unit: "GB", group: "What is inside" },
    { key: "memGen", label: "Memory generation", type: "select", options: MEM_GEN, group: "What is inside" },
    { key: "storageSummary", label: "Storage", type: "text", group: "What is inside", placeholder: "2 x 3.84TB U.2 NVMe" },
    { key: "fabricSummary", label: "Networking", type: "text", group: "What is inside", placeholder: "2 x 25GbE" },

    { key: "peakPowerW", label: "Peak power", type: "number", unit: "W", group: "Power" },
    { key: "bf16Tflops", label: "AI performance", type: "number", unit: "TFLOPS", step: 0.1, group: "Power" },
    { key: "softwareStack", label: "Software installed", type: "list", group: "Power", hint: "One item per line." },
  ],
};

/** Section headings, in order, for a category. */
export function groupsFor(kind: Kind): string[] {
  const seen: string[] = [];
  for (const f of SPEC_FIELDS[kind] ?? []) {
    const g = f.group ?? "Details";
    if (!seen.includes(g)) seen.push(g);
  }
  return seen;
}

/** Every key this category knows how to ask for. */
export function knownKeys(kind: Kind): Set<string> {
  return new Set((SPEC_FIELDS[kind] ?? []).map((f) => f.key));
}
