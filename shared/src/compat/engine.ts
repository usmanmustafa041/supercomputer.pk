/**
 * Compatibility engine.
 *
 * Every rule here corresponds to something that actually stops a machine from
 * working, or degrades it in a way the buyer would be annoyed to discover
 * later. Rules that are merely stylistic are marked "gain" and never block.
 *
 * Severity contract:
 *   error, it will not physically fit, or will not post. Blocks checkout.
 *   warn , it will run, but outside spec, unreliably, or dangerously.
 *   info , a consequence worth knowing about before ordering.
 *   gain , a free improvement available for the same money or less.
 */

// `of()` narrows straight off Product, so the individual kind interfaces are
// never named here.
import type { Product } from "../catalog/types";
import type { Build, BuildSummary, CompatReport, Finding, PowerBudget } from "./types";
import { ruleGeometry } from "./geometry-rule";
import { ruleEssentials } from "./essentials-rule";

/* --------------------------------------------------------------- helpers */

function of<K extends Product["kind"]>(b: Build, kind: K) {
  return b.lines.filter((l) => l.product.kind === kind) as Array<{
    product: Extract<Product, { kind: K }>;
    qty: number;
  }>;
}

function totalQty(lines: Array<{ qty: number }>): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const push = (out: Finding[], f: Finding) => out.push(f);

/** Commercial tariff, PKR per kWh. One place to change it. */
const TARIFF_PKR_KWH = 42;

/* ===================================================== platform: CPU/board */

function ruleCpuBoard(b: Build, out: Finding[]) {
  const mb = first(of(b, "motherboard"))?.product;
  const cpus = of(b, "cpu");
  if (!mb || !cpus.length) return;

  for (const { product: cpu } of cpus) {
    if (cpu.socket !== mb.socket) {
      push(out, {
        rule: "cpu.socket",
        severity: "error",
        title: `${cpu.model} does not fit this board`,
        detail: `The CPU is ${cpu.socket}. ${mb.brand} ${mb.model} is ${mb.socket}. These are physically different sockets, the chip will not seat.`,
        refs: [cpu.id, mb.id],
        fix: `Pick a ${mb.socket} processor, or change the board to a ${cpu.socket} model.`,
      });
    }
  }

  const cpuCount = totalQty(cpus);
  if (cpuCount > mb.sockets) {
    push(out, {
      rule: "cpu.count",
      severity: "error",
      title: `${cpuCount} processors on a ${mb.sockets}-socket board`,
      detail: `${mb.model} has ${mb.sockets} socket${mb.sockets > 1 ? "s" : ""}. You have ${cpuCount} CPUs in the build.`,
      refs: [mb.id, ...cpus.map((c) => c.product.id)],
      fix: `Reduce to ${mb.sockets}, or move to a dual-socket board.`,
    });
  }

  if (mb.sockets > 1 && cpuCount === 1) {
    push(out, {
      rule: "cpu.halfPopulated",
      severity: "warn",
      title: "Dual-socket board with one CPU installed",
      detail:
        "The second socket's memory channels and PCIe lanes stay dark. On most dual-socket boards, several PCIe slots and half the DIMM slots are wired to CPU2 and simply will not work.",
      refs: [mb.id],
      fix: "Add the second processor, or drop to a single-socket board and keep the money.",
    });
  }

  // Mixed CPU models in a multi-socket board will not boot on any platform.
  const models = new Set(cpus.map((c) => c.product.family));
  if (models.size > 1) {
    push(out, {
      rule: "cpu.mixed",
      severity: "error",
      title: "Mixed processor models",
      detail:
        "Multi-socket systems require identical stepping, core count and TDP across sockets. Mismatched CPUs will halt at POST.",
      refs: cpus.map((c) => c.product.id),
      fix: "Use identical CPUs in every socket.",
    });
  }

  for (const { product: cpu } of cpus) {
    if (mb.sockets > cpu.maxSockets) {
      push(out, {
        rule: "cpu.maxSockets",
        severity: "error",
        title: `${cpu.model} cannot run in a ${mb.sockets}-socket board`,
        detail: `This part is capped at ${cpu.maxSockets}-socket operation. Single-socket-only SKUs (the "P" variants) are physically identical but fused to refuse multi-socket use.`,
        refs: [cpu.id, mb.id],
      });
    }
  }
}

/* =============================================================== thermal */

function ruleCooling(b: Build, out: Finding[]) {
  const cpus = of(b, "cpu");
  const coolers = of(b, "cooler").filter((c) => c.product.type !== "air-low" || c.product.tdpRatingW > 0);
  const chassis = first(of(b, "chassis"))?.product;
  if (!cpus.length) return;

  const cpuCount = totalQty(cpus);
  const coolerCount = totalQty(coolers.filter((c) => c.product.tdpRatingW > 0));

  if (coolerCount === 0 && !cpus.every((c) => c.product.coolerIncluded)) {
    push(out, {
      rule: "cool.missing",
      severity: "error",
      title: "No CPU cooler in the build",
      detail:
        "None of the selected processors ship with a heatsink. The machine will thermal-shutdown within seconds of POST.",
      refs: cpus.map((c) => c.product.id),
      fix: "Add a cooler rated for the socket and the processor's peak power.",
    });
  } else if (coolerCount > 0 && coolerCount < cpuCount) {
    push(out, {
      rule: "cool.count",
      severity: "error",
      title: `${cpuCount} processors, ${coolerCount} cooler${coolerCount > 1 ? "s" : ""}`,
      detail: "Every populated socket needs its own heatsink.",
      refs: [...cpus.map((c) => c.product.id), ...coolers.map((c) => c.product.id)],
      fix: `Increase cooler quantity to ${cpuCount}.`,
    });
  }

  for (const { product: cooler } of coolers) {
    if (cooler.tdpRatingW === 0) continue;

    for (const { product: cpu } of cpus) {
      if (!cooler.sockets.includes(cpu.socket) && !cooler.sockets.includes("Universal")) {
        push(out, {
          rule: "cool.socket",
          severity: "error",
          title: `${cooler.model} has no ${cpu.socket} mounting`,
          detail: `Supported sockets: ${cooler.sockets.join(", ")}. Socket ${cpu.socket} is not among them, and server sockets in particular have no aftermarket bracket options.`,
          refs: [cooler.id, cpu.id],
        });
      }

      if (cooler.tdpRatingW < cpu.maxPowerW) {
        const short = cpu.maxPowerW - cooler.tdpRatingW;
        push(out, {
          rule: "cool.capacity",
          severity: short > cpu.maxPowerW * 0.25 ? "error" : "warn",
          title: `${cooler.model} is ${short}W short for ${cpu.model}`,
          detail: `The cooler is rated ${cooler.tdpRatingW}W. The processor draws up to ${cpu.maxPowerW}W sustained, note that is the real peak, not the ${cpu.tdpW}W nameplate TDP.`,
          refs: [cooler.id, cpu.id],
          fix: `Choose a cooler rated at ${Math.ceil(cpu.maxPowerW / 50) * 50}W or higher.`,
        });
      }
    }

    if (chassis) {
      if (cooler.heightMm > 0 && cooler.heightMm > chassis.maxCoolerHeightMm) {
        push(out, {
          rule: "cool.height",
          severity: "error",
          title: `${cooler.model} is too tall for ${chassis.model}`,
          detail: `Cooler height ${cooler.heightMm}mm against a ${chassis.maxCoolerHeightMm}mm ceiling. The side panel or lid will not close.`,
          refs: [cooler.id, chassis.id],
          fix: `Use a cooler under ${chassis.maxCoolerHeightMm}mm, or a liquid loop.`,
        });
      }

      if (cooler.radiatorMm > 0 && cooler.radiatorMm > chassis.maxRadiatorMm) {
        push(out, {
          rule: "cool.radiator",
          severity: "error",
          title: `${cooler.radiatorMm}mm radiator will not mount`,
          detail: `${chassis.model} accepts up to ${chassis.maxRadiatorMm}mm.`,
          refs: [cooler.id, chassis.id],
        });
      }

      if (cooler.needsChassisAirflow && !chassis.forcedAirflow) {
        push(out, {
          rule: "cool.airflow",
          severity: "error",
          title: `${cooler.model} has no fan of its own`,
          detail:
            "Passive rack heatsinks depend entirely on the high static pressure a server chassis generates. In a tower or open frame they do nothing and the CPU will throttle immediately.",
          refs: [cooler.id, chassis.id],
          fix: "Use an active cooler, or move to a chassis with front-to-back forced airflow.",
        });
      }
    }
  }
}

/* ================================================================ memory */

function ruleMemory(b: Build, out: Finding[]) {
  const mb = first(of(b, "motherboard"))?.product;
  const mem = of(b, "memory");
  const cpus = of(b, "cpu");
  const coolers = of(b, "cooler");
  if (!mem.length) return;

  const modules = mem.reduce((n, l) => n + l.product.modules * l.qty, 0);
  const totalGb = mem.reduce((n, l) => n + l.product.moduleGb * l.product.modules * l.qty, 0);

  if (mb) {
    for (const { product: m } of mem) {
      if (m.memGen !== mb.memGen) {
        push(out, {
          rule: "mem.gen",
          severity: "error",
          title: `${m.memGen.toUpperCase()} memory in a ${mb.memGen.toUpperCase()} board`,
          detail: "DDR4 and DDR5 are keyed differently. The module physically cannot be inserted.",
          refs: [m.id, mb.id],
        });
        continue;
      }

      if (!mb.memKinds.includes(m.memKind)) {
        push(out, {
          rule: "mem.kind",
          severity: "error",
          title: `${mb.model} does not accept ${m.memKind.toUpperCase()} modules`,
          detail: m.registered
            ? `Registered memory needs a board with a register-aware memory controller. ${mb.model} accepts ${mb.memKinds.join(", ").toUpperCase()} only, so this module will not train and the board will not POST.`
            : `${mb.model} accepts ${mb.memKinds.join(", ").toUpperCase()}. Unbuffered modules will not initialise on a server memory controller.`,
          refs: [m.id, mb.id],
          fix: `Switch to ${mb.memKinds.map((k) => k.toUpperCase()).join(" or ")} memory.`,
        });
      }

      if (m.mts > mb.memMaxMts) {
        push(out, {
          rule: "mem.speed",
          severity: "info",
          title: `Memory will run below its rating`,
          detail: `${m.model} is rated ${m.mts} MT/s. ${mb.model} tops out at ${mb.memMaxMts} MT/s, so the modules will clock down. They will work, you are simply paying for speed you cannot use.`,
          refs: [m.id, mb.id],
          fix: `A ${mb.memMaxMts} MT/s kit costs less and performs identically here.`,
        });
      }

      if (m.ecc && !mb.eccSupport) {
        push(out, {
          rule: "mem.ecc",
          severity: "warn",
          title: "ECC memory in a board without ECC support",
          detail:
            "The modules will run, but error correction stays disabled and single-bit errors will pass through silently. You get none of what you paid extra for.",
          refs: [m.id, mb.id],
        });
      }
    }

    if (modules > mb.memSlots) {
      push(out, {
        rule: "mem.slots",
        severity: "error",
        title: `${modules} modules, ${mb.memSlots} slots`,
        detail: `${mb.model} has ${mb.memSlots} DIMM slots.`,
        refs: [mb.id, ...mem.map((m) => m.product.id)],
        fix: `Use higher-capacity modules to reach the same total in ${mb.memSlots} slots or fewer.`,
      });
    }

    if (totalGb > mb.maxMemGb) {
      push(out, {
        rule: "mem.max",
        severity: "error",
        title: `${totalGb}GB exceeds the board's ${mb.maxMemGb}GB ceiling`,
        detail: `${mb.model} is qualified to ${mb.maxMemGb}GB.`,
        refs: [mb.id],
      });
    }
  }

  // Channel population. This is the single most common way a build gets
  // quietly slow, and nothing in the machine will warn you about it.
  const cpu = first(cpus)?.product;
  const cpuCount = totalQty(cpus);
  if (cpu && cpuCount > 0 && modules > 0) {
    const channels = cpu.memChannels * cpuCount;
    if (modules % channels !== 0) {
      const good = Math.ceil(modules / channels) * channels;
      push(out, {
        rule: "mem.channels",
        severity: "warn",
        title: `${modules} modules across ${channels} memory channels`,
        detail: `${cpu.model} has ${cpu.memChannels} channels per socket. With ${modules} modules the population is uneven, so the controller falls back to a slower interleave. On a 12-channel EPYC, running 8 modules costs roughly a third of your memory bandwidth.`,
        refs: [cpu.id, ...mem.map((m) => m.product.id)],
        fix: `Populate ${good} modules, one per channel, or two per channel throughout.`,
      });
    }

    if (cpu.memGen !== undefined && mem.some((m) => m.product.mts > cpu.memMaxMts)) {
      push(out, {
        rule: "mem.cpuSpeed",
        severity: "info",
        title: "Processor memory controller is the limit",
        detail: `${cpu.model} runs memory at up to ${cpu.memMaxMts} MT/s regardless of what the modules are rated for.`,
        refs: [cpu.id],
      });
    }

    if (totalGb > cpu.maxMemGb * cpuCount) {
      push(out, {
        rule: "mem.cpuMax",
        severity: "error",
        title: `Memory exceeds the processor's addressable ceiling`,
        detail: `${cpu.model} addresses ${cpu.maxMemGb}GB per socket (${cpu.maxMemGb * cpuCount}GB across ${cpuCount}).`,
        refs: [cpu.id],
      });
    }

    if (mem.some((m) => m.product.ecc) && !cpu.eccSupport) {
      push(out, {
        rule: "mem.cpuEcc",
        severity: "warn",
        title: `${cpu.model} does not support ECC`,
        detail:
          "Intel restricts ECC to Xeon and W-series parts. The modules will run in non-ECC mode.",
        refs: [cpu.id],
      });
    }
  }

  // Tall heatspreaders versus wide air towers, a real and common collision.
  const tallest = Math.max(0, ...mem.map((m) => m.product.heightMm));
  const bigAir = coolers.find((c) => c.product.type === "air-tower" && c.product.heightMm >= 155);
  if (tallest >= 42 && bigAir) {
    push(out, {
      rule: "mem.clearance",
      severity: "warn",
      title: "Tall memory under a wide air cooler",
      detail: `The selected modules stand ${tallest}mm. ${bigAir.product.model} overhangs the first DIMM slots on most boards, and anything over about 40mm fouls the front fan.`,
      refs: [bigAir.product.id, ...mem.map((m) => m.product.id)],
      fix: "Use low-profile modules, raise the cooler's front fan, or fit an AIO.",
    });
  }
}

/* ================================================================== GPUs */

function ruleGpus(b: Build, out: Finding[]) {
  const gpus = of(b, "gpu");
  const mb = first(of(b, "motherboard"))?.product;
  const chassis = first(of(b, "chassis"))?.product;
  const cpus = of(b, "cpu");
  if (!gpus.length) return;

  const gpuCount = totalQty(gpus);

  for (const { product: g } of gpus) {
    if (g.formFactor !== "pcie") {
      push(out, {
        rule: "gpu.form",
        severity: "error",
        title: `${g.model} is an ${g.formFactor.toUpperCase()} module, not a card`,
        detail:
          "SXM and OAM accelerators mount to a vendor baseboard (HGX or UBB) that is sold as part of a complete system. They have no PCIe edge connector and cannot be fitted to a board you assemble yourself.",
        refs: [g.id],
        fix: "Configure this as a complete system instead, or choose the PCIe variant of the same accelerator.",
      });
    }

    if (chassis) {
      if (g.lengthMm > chassis.maxGpuLengthMm) {
        push(out, {
          rule: "gpu.length",
          severity: "error",
          title: `${g.model} is ${g.lengthMm - chassis.maxGpuLengthMm}mm too long`,
          detail: `Card length ${g.lengthMm}mm against ${chassis.maxGpuLengthMm}mm of clearance in ${chassis.model}.`,
          refs: [g.id, chassis.id],
          fix: "Pick a shorter partner card, dual-fan variants are typically 40-60mm shorter.",
        });
      }

      if (g.cooling === "passive" && !chassis.forcedAirflow) {
        push(out, {
          rule: "gpu.passive",
          severity: "error",
          title: `${g.model} has no fans`,
          detail:
            "Datacenter accelerators are passively cooled and rely on the chassis pushing air through the heatsink. In a tower or on an open frame the card will hit its thermal limit within a minute and clock to a crawl.",
          refs: [g.id, chassis.id],
          fix: "Use a server chassis with front-to-back airflow, or choose an actively cooled card.",
        });
      }
    }
  }

  if (chassis) {
    if (gpuCount > chassis.maxGpus) {
      push(out, {
        rule: "gpu.count",
        severity: "error",
        title: `${gpuCount} GPUs in a chassis rated for ${chassis.maxGpus}`,
        detail: `${chassis.model} supports ${chassis.maxGpus} accelerators.`,
        refs: [chassis.id, ...gpus.map((g) => g.product.id)],
      });
    }

    const slotsUsed = gpus.reduce((n, l) => n + Math.ceil(l.product.slotsWide) * l.qty, 0);
    if (slotsUsed > chassis.expansionSlots) {
      push(out, {
        rule: "gpu.slots",
        severity: "error",
        title: `Cards need ${slotsUsed} rear slots, chassis has ${chassis.expansionSlots}`,
        detail:
          "Triple-slot coolers eat the neighbouring expansion positions even though they only use one PCIe connector. Count physical slot thickness, not card count.",
        refs: [chassis.id, ...gpus.map((g) => g.product.id)],
        fix: "Use blower or dual-slot cards, or move to a chassis with more rear openings.",
      });
    }
  }

  if (mb) {
    const x16 = mb.pcieSlots.filter((sl) => sl.width === 16);
    if (gpuCount > x16.length) {
      push(out, {
        rule: "gpu.mbSlots",
        severity: "error",
        title: `${gpuCount} GPUs, ${x16.length} x16 slots on the board`,
        detail: `${mb.model} provides ${x16.length} mechanical x16 slots.`,
        refs: [mb.id],
        fix: "Move to a workstation or server board, WRX90 and SP5 boards carry five to seven full slots.",
      });
    }

    // A card in an electrically-narrow slot is the classic silent tax.
    const wired8OrLess = x16.filter((sl) => sl.lanes < 16).length;
    if (gpuCount > x16.length - wired8OrLess && wired8OrLess > 0) {
      push(out, {
        rule: "gpu.laneWidth",
        severity: "warn",
        title: "At least one GPU will land in a narrower slot",
        detail: `${mb.model} wires ${wired8OrLess} of its x16 slots at x8 or less. The card fits and works, but bandwidth to host memory is halved, that shows up in multi-GPU training, not in gaming.`,
        refs: [mb.id, ...gpus.map((g) => g.product.id)],
      });
    }

    for (const { product: g } of gpus) {
      const best = mb.pcieSlots.filter((sl) => sl.width === 16).sort((a, c) => c.gen - a.gen)[0];
      if (best && g.pcieGen > best.gen) {
        push(out, {
          rule: "gpu.pcieGen",
          severity: "info",
          title: `${g.model} will negotiate down to PCIe ${best.gen}.0`,
          detail: `The card is PCIe ${g.pcieGen}.0; the board's best slot is Gen ${best.gen}. It works at the lower rate. For single-GPU inference the impact is small; for multi-GPU training over the host it is not.`,
          refs: [g.id, mb.id],
        });
      }
    }
  }

  // CPU lane budget, the constraint people forget until the board posts with
  // half its slots disabled.
  const cpu = first(cpus)?.product;
  if (cpu) {
    const lanes = cpu.pcieLanes * totalQty(cpus);
    const nicLanes = of(b, "nic").reduce((n, l) => n + l.product.pcieWidth * l.qty, 0);
    const nvmeLanes = of(b, "storage").filter((s) => s.product.bus !== "sata" && s.product.bus !== "sas3")
      .reduce((n, l) => n + (l.product.pcieWidth ?? 4) * l.qty, 0);
    const gpuLanes = gpus.reduce((n, l) => n + 16 * l.qty, 0);
    const need = gpuLanes + nicLanes + nvmeLanes;

    if (need > lanes) {
      push(out, {
        rule: "pcie.lanes",
        severity: "warn",
        title: `PCIe lane budget oversubscribed: ${need} needed, ${lanes} available`,
        detail: `${cpu.model} provides ${cpu.pcieLanes} lanes per socket. GPUs want ${gpuLanes}, network ${nicLanes}, NVMe ${nvmeLanes}. The chipset will share lanes between devices, so some will run narrower than their connector suggests.`,
        refs: [cpu.id],
        fix: cpu.pcieLanes < 100
          ? "A Threadripper PRO or EPYC part gives you 128 lanes and removes the problem entirely."
          : "Reduce NVMe count, or accept x8 operation on the lower-priority cards.",
      });
    }
  }

  // NVLink only does anything in matched pairs.
  const nvlinkCards = gpus.filter((g) => g.product.nvlink);
  const nvlinkQty = totalQty(nvlinkCards);
  if (nvlinkQty === 1 && gpuCount === 1) {
    push(out, {
      rule: "gpu.nvlinkSolo",
      severity: "gain",
      title: "NVLink capability unused with a single card",
      detail: `${nvlinkCards[0].product.model} supports NVLink. A second identical card plus a bridge gives you one pooled memory space, ${nvlinkCards[0].product.vramGb * 2}GB, rather than two isolated ones.`,
      refs: [nvlinkCards[0].product.id],
    });
  }
  if (nvlinkQty > 1 && nvlinkQty % 2 !== 0) {
    push(out, {
      rule: "gpu.nvlinkOdd",
      severity: "info",
      title: "Odd number of NVLink-capable cards",
      detail: "Bridges pair cards two at a time. With an odd count, one card ends up unbridged.",
      refs: nvlinkCards.map((g) => g.product.id),
    });
  }

  // Mixed GPU models: works, but training frameworks will run at the slowest.
  const families = new Set(gpus.map((g) => g.product.family));
  if (families.size > 1 && gpuCount > 1) {
    push(out, {
      rule: "gpu.mixed",
      severity: "warn",
      title: "Mixed accelerator models in one node",
      detail:
        "Data-parallel training synchronises every step, so the whole node runs at the pace of the slowest card and is limited by its VRAM. Mixed GPUs are fine for independent jobs and poor for one big one.",
      refs: gpus.map((g) => g.product.id),
    });
  }
}

/* =============================================================== storage */

/** Which drives a given backplane will physically accept and speak to. */
const BACKPLANE_ACCEPTS: Record<string, string[]> = {
  u2: ["u2"],
  u3: ["u3", "u2", "sata", "sas3", "sas4"],
  sas3: ["sas3", "sata"],
  sas4: ["sas4", "sas3", "sata"],
  e1s: ["e1s"],
  e3s: ["e3s"],
  sata: ["sata"],
  none: [],
};

function ruleStorage(b: Build, out: Finding[]) {
  const drives = of(b, "storage");
  const mb = first(of(b, "motherboard"))?.product;
  const chassis = first(of(b, "chassis"))?.product;
  if (!drives.length) return;

  const byBus = new Map<string, number>();
  for (const l of drives) byBus.set(l.product.bus, (byBus.get(l.product.bus) ?? 0) + l.qty);

  if (mb) {
    const m2 = byBus.get("m2-nvme") ?? 0;
    if (m2 > mb.m2Slots) {
      push(out, {
        rule: "sto.m2",
        severity: "error",
        title: `${m2} M.2 drives, ${mb.m2Slots} M.2 slots`,
        detail: `${mb.model} has ${mb.m2Slots} onboard M.2 sockets.`,
        refs: [mb.id],
        fix: "Add a PCIe-to-M.2 carrier card, or move the surplus to U.2.",
      });
    }

    const sata = byBus.get("sata") ?? 0;
    if (sata > mb.sataPorts + (chassis?.backplane === "sata" ? chassis.hotSwapBays : 0)) {
      push(out, {
        rule: "sto.sata",
        severity: "error",
        title: `${sata} SATA devices, ${mb.sataPorts} ports`,
        detail: `${mb.model} provides ${mb.sataPorts} SATA connectors.`,
        refs: [mb.id],
        fix: "Add an HBA in IT mode, which also gives you a cleaner path for ZFS.",
      });
    }

    // M.2 length is the trap: 22110 datacenter drives foul 2280-only slots.
    for (const { product: d } of drives) {
      if (d.bus === "m2-nvme" && d.physical === "22110") {
        push(out, {
          rule: "sto.m2Length",
          severity: "info",
          title: `${d.model} is a 110mm M.2 module`,
          detail:
            "22110 drives are 30mm longer than the common 2280 size. Many desktop boards only have standoffs for 2280 and the drive will not screw down.",
          refs: [d.id, mb.id],
        });
      }
    }
  }

  const hotSwapNeeded = drives
    .filter((d) => ["u2", "u3", "sas3", "sas4", "e1s", "e3s"].includes(d.product.bus))
    .reduce((n, l) => n + l.qty, 0);

  if (hotSwapNeeded > 0) {
    if (!chassis) {
      push(out, {
        rule: "sto.noChassis",
        severity: "info",
        title: "Hot-swap drives selected without a chassis",
        detail: "U.2, U.3 and EDSFF drives need a backplane. Add the chassis to validate the bay count.",
        refs: drives.map((d) => d.product.id),
      });
    } else {
      if (hotSwapNeeded > chassis.hotSwapBays + (mb?.u2Ports ?? 0)) {
        push(out, {
          rule: "sto.bays",
          severity: "error",
          title: `${hotSwapNeeded} enterprise drives, ${chassis.hotSwapBays} hot-swap bays`,
          detail: `${chassis.model} has ${chassis.hotSwapBays} bays${mb?.u2Ports ? ` and the board adds ${mb.u2Ports} direct U.2 ports` : ""}.`,
          refs: [chassis.id],
        });
      }

      const accepts = BACKPLANE_ACCEPTS[chassis.backplane] ?? [];
      for (const { product: d } of drives) {
        if (!["u2", "u3", "sas3", "sas4", "e1s", "e3s", "sata"].includes(d.bus)) continue;
        if (chassis.backplane === "none") continue;
        if (!accepts.includes(d.bus)) {
          push(out, {
            rule: "sto.backplane",
            severity: "error",
            title: `${d.bus.toUpperCase()} drive in a ${chassis.backplane.toUpperCase()} backplane`,
            detail:
              d.bus === "u3" && chassis.backplane === "u2"
                ? "U.3 drives are backwards compatible into U.2 bays in one direction only: a U.3 drive needs a U.3 backplane to be detected. The connector mates but the drive will not enumerate."
                : `This backplane speaks ${accepts.join(", ").toUpperCase()}. An ${d.bus.toUpperCase()} drive will not be detected.`,
            refs: [d.id, chassis.id],
          });
        }
      }
    }
  }

  // Endurance sanity for anything that will take sustained writes.
  const qlc = drives.filter((d) => d.product.media === "nvme-qlc");
  if (qlc.length && of(b, "gpu").length > 0) {
    push(out, {
      rule: "sto.qlc",
      severity: "info",
      title: "QLC storage in a training build",
      detail: `${qlc[0].product.model} is rated ${qlc[0].product.dwpd} DWPD. Checkpoint writes from a multi-GPU job will chew through that quickly. QLC is the right choice for the read-heavy dataset tier and the wrong one for scratch.`,
      refs: qlc.map((d) => d.product.id),
      fix: "Pair it with a small TLC drive for checkpoints and scratch.",
    });
  }

  const noPlp = drives.filter((d) => !d.product.powerLossProtection && d.product.bus !== "sata" && d.product.media.startsWith("nvme"));
  if (noPlp.length && b.target !== "desk") {
    push(out, {
      rule: "sto.plp",
      severity: "warn",
      title: "Consumer NVMe without power-loss protection in a server build",
      detail:
        "Without onboard capacitors, an unexpected power cut can lose writes the drive has already acknowledged. Given the state of the grid here, that is not a theoretical risk.",
      refs: noPlp.map((d) => d.product.id),
      fix: "Use a datacenter drive with PLP for anything holding real data.",
    });
  }
}

/* ================================================================= power */

export function computePower(b: Build): PowerBudget {
  let sustained = 0;

  for (const l of b.lines) {
    const p = l.product;
    switch (p.kind) {
      case "gpu": sustained += p.tdpW * l.qty; break;
      case "cpu": sustained += p.maxPowerW * l.qty; break;
      case "storage": sustained += p.tdpW * l.qty; break;
      case "nic": sustained += p.tdpW * l.qty; break;
      case "switch": sustained += p.tdpW * l.qty; break;
      case "optic": sustained += p.powerW * l.qty; break;
      case "motherboard": sustained += 60 * l.qty; break;
      case "cooler": sustained += (p.type === "aio" ? 15 : 6) * l.qty; break;
      case "memory": sustained += (p.memGen === "ddr5" ? 5 : 3) * p.modules * l.qty; break;
      case "chassis": sustained += (p.forcedAirflow ? 120 : 25) * l.qty; break;
      case "system": sustained += p.peakPowerW * l.qty; break;
      default: break;
    }
  }

  // GPUs and modern CPUs spike well above sustained for a few milliseconds.
  // PSU protection circuits trip on the spike, not the average.
  const gpuW = of(b, "gpu").reduce((n, l) => n + l.product.tdpW * l.qty, 0);
  const peak = Math.round(sustained + gpuW * 0.35);

  const psus = of(b, "psu");
  const supplied = psus.reduce((n, l) => n + l.product.wattage * l.qty, 0);
  // With redundant modules, one is assumed dead when sizing.
  const redundant = psus.reduce((n, l) => {
    const units = l.qty * (l.product.redundancy > 1 ? 1 : 1);
    const usable = l.product.redundancy > 1 && l.qty > 1 ? (l.qty - 1) * l.product.wattage : units * l.product.wattage;
    return n + usable;
  }, 0);

  const kwh = (sustained / 1000) * 24 * 365 * 0.7; // 70% duty cycle
  return {
    sustainedW: Math.round(sustained),
    peakW: peak,
    suppliedW: supplied,
    redundantW: Math.round(redundant),
    headroomPct: supplied > 0 ? Math.round(((supplied - peak) / supplied) * 100) : 0,
    amps230: Math.round((peak / 230) * 10) / 10,
    annualPkr: Math.round(kwh * TARIFF_PKR_KWH),
  };
}

function rulePower(b: Build, out: Finding[]) {
  const psus = of(b, "psu");
  const chassis = first(of(b, "chassis"))?.product;
  const mb = first(of(b, "motherboard"))?.product;
  const gpus = of(b, "gpu");
  const power = computePower(b);

  if (!psus.length) {
    if (power.peakW > 0) {
      push(out, {
        rule: "psu.missing",
        severity: "error",
        title: "No power supply in the build",
        detail: `The configuration draws about ${power.peakW}W at peak.`,
        refs: [],
        fix: `Add a unit of at least ${Math.ceil((power.peakW * 1.25) / 50) * 50}W.`,
      });
    }
    return;
  }

  const needed = Math.ceil((power.peakW * 1.2) / 50) * 50;
  if (power.suppliedW < power.peakW) {
    push(out, {
      rule: "psu.undersized",
      severity: "error",
      title: `Power supply is ${power.peakW - power.suppliedW}W short`,
      detail: `Peak draw is about ${power.peakW}W including GPU transients; installed capacity is ${power.suppliedW}W. The unit will shut down under load, usually mid-job.`,
      refs: psus.map((p) => p.product.id),
      fix: `Fit at least ${needed}W.`,
    });
  } else if (power.suppliedW < needed) {
    push(out, {
      rule: "psu.headroom",
      severity: "warn",
      title: `Only ${power.headroomPct}% power headroom`,
      detail: `Running a supply near its ceiling shortens its life, pushes the fan to maximum and leaves nothing for expansion. Aim for 20-30% spare.`,
      refs: psus.map((p) => p.product.id),
      fix: `${needed}W would give comfortable margin.`,
    });
  }

  for (const { product: psu } of psus) {
    if (chassis && !chassis.psuForms.includes(psu.form)) {
      push(out, {
        rule: "psu.form",
        severity: "error",
        title: `${psu.form.toUpperCase()} supply will not mount in ${chassis.model}`,
        detail: `This chassis takes ${chassis.psuForms.join(", ").toUpperCase()} units.`,
        refs: [psu.id, chassis.id],
      });
    }

    if (psu.inputVoltsMin > 230) {
      push(out, {
        rule: "psu.mains",
        severity: "error",
        title: `${psu.model} needs more than 230V input`,
        detail: "Pakistani single-phase mains is 230V/50Hz. This unit requires a higher input voltage to start.",
        refs: [psu.id],
      });
    } else if (psu.inputVoltsMin >= 200) {
      push(out, {
        rule: "psu.mains200",
        severity: "info",
        title: `${psu.model} requires 200-240V input`,
        detail:
          "That suits Pakistan's 230V mains and the unit will deliver full rated output. Worth knowing if the machine is ever moved to a 110V region, it will not start there.",
        refs: [psu.id],
      });
    }
  }

  // Connector arithmetic. Adapters are where GPU power problems begin.
  const conn = psus.reduce((acc, l) => {
    for (const [k, v] of Object.entries(l.product.connectors)) {
      acc[k] = (acc[k] ?? 0) + (v as number) * l.qty;
    }
    return acc;
  }, {} as Record<string, number>);

  const need12v = gpus.filter((g) => g.product.connectors.some((c) => c === "12vhpwr" || c === "12v2x6"))
    .reduce((n, l) => n + l.qty, 0);
  const have12v = (conn["12vhpwr"] ?? 0) + (conn["12v2x6"] ?? 0);
  if (need12v > have12v) {
    push(out, {
      rule: "psu.conn12v",
      severity: "error",
      title: `${need12v} cards need a 12VHPWR lead, supply provides ${have12v}`,
      detail:
        "Running a 450W-plus card off a four-way 8-pin adapter is the single most common cause of melted connectors. Use a native cable from the supply.",
      refs: [...psus.map((p) => p.product.id), ...gpus.map((g) => g.product.id)],
      fix: "Choose an ATX 3.1 supply with enough native 12V-2x6 cables for every card.",
    });
  }

  const need8 = gpus.reduce((n, l) => n + l.product.connectors.filter((c) => c === "pcie-8" || c === "pcie-6").length * l.qty, 0);
  if (need8 > (conn["pcie-8"] ?? 0)) {
    push(out, {
      rule: "psu.connPcie",
      severity: "error",
      title: `${need8} PCIe 8-pin leads required, ${conn["pcie-8"] ?? 0} available`,
      detail: "Daisy-chaining two GPU connectors onto one cable exceeds the 150W-per-cable rating.",
      refs: psus.map((p) => p.product.id),
      fix: "Use a supply with more independent PCIe cables, or add a second unit.",
    });
  }

  if (mb && (conn["eps-8"] ?? 0) < mb.epsHeaders) {
    push(out, {
      rule: "psu.connEps",
      severity: "error",
      title: `Board wants ${mb.epsHeaders} EPS connectors, supply has ${conn["eps-8"] ?? 0}`,
      detail:
        "High-core-count processors pull more than one 8-pin EPS cable can carry. Leaving a header empty causes shutdowns under all-core load, not at idle, so it passes a quick test and fails a real job.",
      refs: [mb.id, ...psus.map((p) => p.product.id)],
    });
  }

  // Some datacenter cards take an EPS-style lead, not a PCIe one. People
  // discover this after the card arrives.
  const epsGpus = gpus.filter((g) => g.product.connectors.includes("eps-8"));
  if (epsGpus.length) {
    push(out, {
      rule: "psu.gpuEps",
      severity: "info",
      title: "These accelerators use a CPU-style power lead",
      detail: `${epsGpus.map((g) => g.product.model).join(", ")} take an 8-pin EPS connector, which is keyed differently from PCIe 8-pin. Plugging a PCIe cable in will damage the card.`,
      refs: epsGpus.map((g) => g.product.id),
      fix: "Confirm the supply has a spare EPS lead per card, or order the correct adapter with the order.",
    });
  }

  for (const { product: g } of gpus) {
    if ((g.connectors.includes("12v2x6") || g.connectors.includes("12vhpwr")) && psus.some((p) => p.product.atxSpec === "2.4")) {
      push(out, {
        rule: "psu.atxSpec",
        severity: "warn",
        title: "ATX 2.4 supply feeding a 12VHPWR card",
        detail:
          "Pre-3.0 units were not designed for the transient spikes these cards produce and will trip their over-current protection. An adapter does not fix that.",
        refs: [g.id, ...psus.map((p) => p.product.id)],
        fix: "Move to an ATX 3.0 or 3.1 supply with a native cable.",
      });
      break;
    }
  }

  // Pakistan-specific: a 16A domestic circuit is 3.68kW, but continuous load
  // should not exceed 80% of that, so ~2.9kW is the real working ceiling.
  if (power.peakW > 2900 && b.target === "desk") {
    push(out, {
      rule: "power.circuit",
      severity: "warn",
      title: `${power.amps230}A continuous on a single 230V circuit`,
      detail:
        "A standard 16A Pakistani domestic circuit is rated 3.68kW, and continuous load should stay under 80% of that, about 2.9kW. Everything else on the same ring shares it. This build will trip the breaker under sustained load.",
      refs: [],
      fix: "Have a dedicated 20A radial circuit run for the machine, or split the load across two supplies on separate circuits.",
    });
  }

  if (b.target !== "desk" && psus.length && !psus.some((p) => p.product.redundancy > 1)) {
    push(out, {
      rule: "psu.redundancy",
      severity: "warn",
      title: "Single non-redundant supply in a rack build",
      detail:
        "A PSU failure takes the node down until someone is physically present. Redundant CRPS modules hot-swap without an outage.",
      refs: psus.map((p) => p.product.id),
    });
  }
}

/* ================================================================ chassis */

function ruleChassis(b: Build, out: Finding[]) {
  const chassis = first(of(b, "chassis"))?.product;
  const mb = first(of(b, "motherboard"))?.product;
  if (!chassis || !mb) return;

  if (!chassis.moboForms.includes(mb.form)) {
    push(out, {
      rule: "chassis.form",
      severity: "error",
      title: `${mb.form.toUpperCase()} board will not mount in ${chassis.model}`,
      detail: `This chassis has standoffs for ${chassis.moboForms.join(", ").toUpperCase()}. ${mb.form.toUpperCase()} boards are a different size and hole pattern.`,
      refs: [mb.id, chassis.id],
    });
  }

  // The deployment target and the chassis have to agree. Without this the
  // target selector had no observable effect once a case was chosen.
  if (b.target !== "desk" && chassis.rackU === 0) {
    push(out, {
      rule: "chassis.notRackable",
      severity: "error",
      title: `${chassis.model} cannot be rack mounted`,
      detail:
        chassis.form === "open-frame"
          ? "An open frame has no rails, no ears and no enclosed airflow path. It cannot go in a rack or a colocation cabinet."
          : `This is a ${chassis.form.replace("-", " ")}. It has no rack ears or rail mounts, so it cannot be installed in a cabinet.`,
      refs: [chassis.id],
      fix: "Choose a rack chassis, or switch the deployment target to desk-side.",
    });
  }

  if (b.target === "desk" && chassis.rackU > 0) {
    push(out, {
      rule: "chassis.rackOnDesk",
      severity: "warn",
      title: `${chassis.model} is a ${chassis.rackU}U rack chassis`,
      detail:
        "Rack servers run 40mm fans at high static pressure. Next to a desk they are genuinely loud, 60 dBA and up under load, and they draw air from the front and dump it out the back into whoever is sitting behind.",
      refs: [chassis.id],
      fix: "For a desk-side machine, a tower chassis with 140mm fans is far quieter.",
    });
  }

  if (mb.ipmi === false && chassis.rackU > 0) {
    push(out, {
      rule: "chassis.ipmi",
      severity: "warn",
      title: "Rack-mounted board with no out-of-band management",
      detail:
        "Without IPMI or a BMC you need physical access with a crash cart every time the machine will not boot. In a colocation facility that means a site visit.",
      refs: [mb.id],
      fix: "Choose a server board with IPMI, or budget for a network KVM.",
    });
  }
}

/* ================================================================= fabric */

function ruleFabric(b: Build, out: Finding[]) {
  const nics = of(b, "nic");
  const switches = of(b, "switch");
  const optics = of(b, "optic");
  const mb = first(of(b, "motherboard"))?.product;
  const chassis = first(of(b, "chassis"))?.product;

  for (const { product: n } of nics) {
    if (mb) {
      const fits = mb.pcieSlots.some((sl) => sl.width >= n.pcieWidth);
      if (!fits) {
        push(out, {
          rule: "nic.slot",
          severity: "error",
          title: `No slot wide enough for ${n.model}`,
          detail: `The adapter needs a mechanical x${n.pcieWidth} slot.`,
          refs: [n.id, mb.id],
        });
      }
      const bestGen = Math.max(...mb.pcieSlots.map((sl) => sl.gen));
      if (n.pcieGen > bestGen && n.portGbps >= 100) {
        push(out, {
          rule: "nic.bandwidth",
          severity: "warn",
          title: `${n.model} cannot reach line rate on this board`,
          detail: `A ${n.portGbps}G port needs PCIe ${n.pcieGen}.0 x${n.pcieWidth} to saturate. The board tops out at Gen ${bestGen}, which caps the adapter at roughly ${Math.round(n.portGbps * (bestGen / n.pcieGen))}G.`,
          refs: [n.id, mb.id],
        });
      }
    }

    if (chassis && chassis.rackU === 1 && !n.lowProfile) {
      push(out, {
        rule: "nic.profile",
        severity: "error",
        title: `${n.model} is full height`,
        detail: "A 1U chassis only accepts low-profile cards, and this adapter does not have a low-profile bracket option.",
        refs: [n.id, chassis.id],
      });
    }
  }

  // Port type has to match end to end: NIC, cable and switch.
  for (const { product: o } of optics) {
    const nicMatch = nics.some((n) => n.product.portType === o.portType);
    const swMatch = switches.some((s) => s.product.portType === o.portType);

    if (nics.length && !nicMatch) {
      push(out, {
        rule: "optic.nicPort",
        severity: "error",
        title: `${o.portType.toUpperCase()} cable does not fit any adapter in the build`,
        detail: `Adapters present use ${[...new Set(nics.map((n) => n.product.portType))].join(", ").toUpperCase()}. Cage sizes are not interchangeable.`,
        refs: [o.id, ...nics.map((n) => n.product.id)],
      });
    }

    if (switches.length && !swMatch) {
      push(out, {
        rule: "optic.swPort",
        severity: "error",
        title: `${o.portType.toUpperCase()} cable does not fit the switch`,
        detail: `The switch uses ${[...new Set(switches.map((s) => s.product.portType))].join(", ").toUpperCase()} cages.`,
        refs: [o.id, ...switches.map((s) => s.product.id)],
      });
    }

    // Vendor coding: the most frustrating failure mode because everything
    // looks correct and the link light simply never comes on.
    const brands = [...new Set([...nics.map((n) => n.product.brand), ...switches.map((s) => s.product.brand)])];
    const codedOk = o.codedFor === "Generic" || brands.some((br) =>
      o.codedFor.toLowerCase().includes(br.toLowerCase()) || br.toLowerCase().includes(o.codedFor.split("/")[0].toLowerCase())
    );
    if (brands.length && !codedOk) {
      push(out, {
        rule: "optic.coding",
        severity: "warn",
        title: `${o.model} is coded for ${o.codedFor}`,
        detail: `The build uses ${brands.join(" and ")} equipment. Most switches read the module's EEPROM and refuse to bring the port up if the vendor string does not match. The cable is electrically fine, the firmware just will not accept it.`,
        refs: [o.id],
        fix: `Order the ${brands[0]}-coded version of the same cable.`,
      });
    }
  }

  // InfiniBand versus Ethernet: same cages, entirely different protocol.
  const ibNics = nics.filter((n) => n.product.fabric === "infiniband");
  const vpiNics = nics.filter((n) => n.product.fabric === "both");
  const ethSwitches = switches.filter((s) => s.product.fabric === "ethernet");
  const ibSwitches = switches.filter((s) => s.product.fabric === "infiniband");

  if (ibNics.length && ethSwitches.length && !ibSwitches.length) {
    push(out, {
      rule: "fabric.mismatch",
      severity: "error",
      title: "InfiniBand-only adapters with an Ethernet switch",
      detail:
        "The connectors mate and the cable is identical, but the protocols are unrelated. An InfiniBand-only part number has no Ethernet personality and will never bring the link up.",
      refs: [...ibNics.map((n) => n.product.id), ...ethSwitches.map((s) => s.product.id)],
      fix: "Use a VPI adapter that can switch to Ethernet mode, or an InfiniBand switch.",
    });
  }

  if (vpiNics.length && ethSwitches.length && !ibSwitches.length) {
    push(out, {
      rule: "fabric.vpiEth",
      severity: "info",
      title: "VPI adapters will run in Ethernet mode",
      detail:
        "These cards do both, but with an Ethernet switch they link as Ethernet. You keep RoCE and GPUDirect; you lose InfiniBand's in-network reduction and its subnet manager.",
      refs: vpiNics.map((n) => n.product.id),
    });
  }

  if (ibSwitches.length && nics.length && !ibNics.length && !vpiNics.length) {
    push(out, {
      rule: "fabric.ethOnIb",
      severity: "error",
      title: "Ethernet-only adapters with an InfiniBand switch",
      detail: "An Ethernet NIC cannot speak InfiniBand. The port will stay down.",
      refs: [...nics.map((n) => n.product.id), ...ibSwitches.map((s) => s.product.id)],
      fix: "Use ConnectX VPI or InfiniBand adapters with this switch.",
    });
  }

  if (nics.length && switches.length && !optics.length) {
    push(out, {
      rule: "fabric.noCable",
      severity: "warn",
      title: "Adapters and switch selected, no cabling",
      detail:
        "SFP and QSFP ports ship empty. Neither the switch nor the adapter includes transceivers or DACs, and they are a meaningful share of the fabric budget.",
      refs: [],
      fix: `Add ${totalQty(nics)} cables matching the ${nics[0].product.portType.toUpperCase()} port type.`,
    });
  }

  // GPUDirect is the reason to buy these adapters; flag when it is wasted.
  const gpus = of(b, "gpu");
  if (gpus.length > 1 && nics.length && !nics.some((n) => n.product.gpuDirect)) {
    push(out, {
      rule: "fabric.gpudirect",
      severity: "gain",
      title: "Multi-GPU node without a GPUDirect-capable adapter",
      detail:
        "Without GPUDirect RDMA every gradient exchange bounces through host memory, which roughly doubles inter-node latency. A ConnectX adapter moves data straight between GPU memory and the wire.",
      refs: nics.map((n) => n.product.id),
    });
  }
}

/* ============================================================== facility */

function ruleFacility(b: Build, out: Finding[]) {
  const rack = first(of(b, "rack"))?.product;
  const pdus = of(b, "pdu");
  const upses = of(b, "ups");
  const chassis = of(b, "chassis");
  const switches = of(b, "switch");
  const power = computePower(b);

  const rackU =
    chassis.reduce((n, l) => n + l.product.rackU * l.qty, 0) +
    switches.reduce((n, l) => n + l.product.rackU * l.qty, 0) +
    upses.reduce((n, l) => n + l.product.rackU * l.qty, 0) +
    pdus.reduce((n, l) => n + l.product.rackU * l.qty, 0) +
    of(b, "system").reduce((n, l) => n + l.product.rackU * l.qty, 0);

  if (rack) {
    if (rackU > rack.heightU) {
      push(out, {
        rule: "rack.height",
        severity: "error",
        title: `${rackU}U of equipment in a ${rack.heightU}U rack`,
        detail: `${rack.model} provides ${rack.heightU} usable units.`,
        refs: [rack.id],
      });
    }

    const deepest = Math.max(0, ...chassis.map((c) => c.product.depthMm));
    // Leave 150mm behind the chassis for cable bend radius and PDU bodies.
    if (deepest > 0 && deepest + 150 > rack.depthMm) {
      push(out, {
        rule: "rack.depth",
        severity: "error",
        title: `Chassis is too deep for ${rack.model}`,
        detail: `The deepest unit is ${deepest}mm. The rack is ${rack.depthMm}mm, and you need roughly 150mm behind the equipment for cabling and the vertical PDU. Cables bent tighter than their minimum radius fail intermittently and are miserable to diagnose.`,
        refs: [rack.id, ...chassis.map((c) => c.product.id)],
        fix: `A ${Math.ceil((deepest + 150) / 100) * 100}mm-deep rack clears it.`,
      });
    }

    if (rack.perforationPct < 65 && of(b, "gpu").length > 0) {
      push(out, {
        rule: "rack.perforation",
        severity: "warn",
        title: `${rack.perforationPct}% door perforation with GPU nodes installed`,
        detail:
          "Dense accelerators need at least 65-70% open area front and rear. Below that the doors themselves become the thermal restriction and inlet temperatures climb.",
        refs: [rack.id],
      });
    }
  } else if (rackU > 0 && b.target !== "desk") {
    push(out, {
      rule: "rack.missing",
      severity: "info",
      title: `${rackU}U of rack equipment with no rack selected`,
      detail: "Add a rack to validate depth, load and power distribution.",
      refs: [],
    });
  }

  if (pdus.length) {
    const kw = pdus.reduce((n, l) => n + l.product.maxKw * l.qty, 0);
    if (power.peakW / 1000 > kw) {
      push(out, {
        rule: "pdu.capacity",
        severity: "error",
        title: `Load is ${(power.peakW / 1000).toFixed(1)}kW, distribution provides ${kw.toFixed(1)}kW`,
        detail: "The PDU breaker will trip on load.",
        refs: pdus.map((p) => p.product.id),
        fix: power.peakW > 8000 ? "At this draw you want a three-phase PDU and a matching supply." : "Add a second PDU on an independent feed.",
      });
    }

    if (power.peakW > 8000 && !pdus.some((p) => p.product.phases === 3)) {
      push(out, {
        rule: "pdu.phase",
        severity: "warn",
        title: "Over 8kW on single-phase distribution",
        detail:
          "Beyond roughly 7.4kW a single-phase 32A feed is exhausted. Three-phase spreads the load and is what any facility will expect at this density.",
        refs: pdus.map((p) => p.product.id),
      });
    }
  } else if (b.target !== "desk" && power.peakW > 0) {
    push(out, {
      rule: "pdu.missing",
      severity: "info",
      title: "No power distribution in the build",
      detail: `The configuration needs about ${(power.peakW / 1000).toFixed(1)}kW delivered to the rack.`,
      refs: [],
    });
  }

  if (upses.length) {
    const upsW = upses.reduce((n, l) => n + l.product.wattage * l.qty, 0);
    if (upsW < power.peakW) {
      push(out, {
        rule: "ups.capacity",
        severity: "error",
        title: `UPS supplies ${upsW}W against a ${power.peakW}W load`,
        detail:
          "An overloaded UPS drops straight to bypass, which means it does nothing at the exact moment you need it.",
        refs: upses.map((u) => u.product.id),
        fix: `Size for at least ${Math.ceil((power.peakW * 1.25) / 500) * 500}W.`,
      });
    }
    if (upses.some((u) => u.product.topology === "line-interactive") && of(b, "gpu").length > 2) {
      push(out, {
        rule: "ups.topology",
        severity: "warn",
        title: "Line-interactive UPS on a multi-GPU load",
        detail:
          "The transfer gap when switching to battery is a few milliseconds. Modern high-wattage supplies mostly ride through it, but with grid quality as variable as it is here, double-conversion is the safer specification.",
        refs: upses.map((u) => u.product.id),
      });
    }
  } else if (power.peakW > 500) {
    push(out, {
      rule: "ups.missing",
      severity: b.target === "desk" ? "info" : "warn",
      title: "No UPS in the configuration",
      detail:
        "Load-shedding and unannounced outages will otherwise cut a running job and risk the filesystem. This matters more here than it would elsewhere.",
      refs: [],
      fix: `A ${Math.ceil((power.peakW * 1.3) / 500) * 500}W unit covers this build.`,
    });
  }
}

/* ============================================================== hygiene */

function ruleHygiene(b: Build, out: Finding[]) {
  const kinds = new Set(b.lines.map((l) => l.product.kind));
  const isPartsBuild = kinds.has("motherboard") || kinds.has("cpu") || kinds.has("gpu");
  if (!isPartsBuild) return;

  const required: Array<[string, string]> = [
    ["cpu", "processor"],
    ["motherboard", "motherboard"],
    ["memory", "memory"],
    ["storage", "storage"],
    ["psu", "power supply"],
    ["chassis", "chassis"],
  ];
  const missing = required.filter(([k]) => !kinds.has(k as never)).map(([, label]) => label);
  if (missing.length) {
    push(out, {
      rule: "build.incomplete",
      severity: "info",
      title: `Still needed: ${missing.join(", ")}`,
      detail: "Compatibility checks that depend on these parts are being skipped until they are selected.",
      refs: [],
    });
  }

  // Condition mixing, legitimate, but worth surfacing before purchase.
  const pulls = b.lines.filter((l) => l.product.condition === "pull" || l.product.condition === "refurb-b");
  if (pulls.length && b.target === "cluster") {
    push(out, {
      rule: "build.conditionMix",
      severity: "info",
      title: `${pulls.length} line${pulls.length > 1 ? "s are" : " is"} tested-pull or Grade B`,
      detail:
        "Fine for compute nodes where a failure just re-queues the job. Think harder about it for the head node, storage or the fabric, those are single points of failure.",
      refs: pulls.map((l) => l.product.id),
    });
  }

  const noEcc = b.lines.some((l) => l.product.kind === "memory" && !l.product.ecc);
  if (noEcc && b.target !== "desk") {
    push(out, {
      rule: "build.eccMissing",
      severity: "warn",
      title: "Non-ECC memory in a server build",
      detail:
        "At server memory capacities, single-bit errors are a matter of when rather than if. Without ECC they corrupt results silently, a long training run finishes and the numbers are simply wrong.",
      refs: b.lines.filter((l) => l.product.kind === "memory" && !l.product.ecc).map((l) => l.product.id),
    });
  }
}

/* ============================================================== summary */

export function summarise(b: Build): BuildSummary {
  const counts: BuildSummary["counts"] = {};
  let totalPkr = 0, cores = 0, threads = 0, memGb = 0, vramGb = 0, storageTb = 0;
  let fp32 = 0, bf16 = 0, gpuCount = 0, rackU = 0;
  let inHouseLines = 0, sourcedLines = 0, maxLeadDays = 0;

  for (const l of b.lines) {
    const p = l.product;
    counts[p.kind] = (counts[p.kind] ?? 0) + l.qty;
    totalPkr += p.price.pkr * l.qty;
    if (p.avail.inHouse >= l.qty) inHouseLines++;
    else {
      sourcedLines++;
      maxLeadDays = Math.max(maxLeadDays, p.avail.leadDays);
    }

    switch (p.kind) {
      case "cpu": cores += p.cores * l.qty; threads += p.threads * l.qty; break;
      case "gpu":
        vramGb += p.vramGb * l.qty;
        fp32 += p.fp32Tflops * l.qty;
        bf16 += p.bf16Tflops * l.qty;
        gpuCount += l.qty;
        break;
      case "memory": memGb += p.moduleGb * p.modules * l.qty; break;
      case "storage": storageTb += (p.capacityGb / 1000) * l.qty; break;
      case "chassis": rackU += p.rackU * l.qty; break;
      case "switch": rackU += p.rackU * l.qty; break;
      case "ups": rackU += p.rackU * l.qty; break;
      case "pdu": rackU += p.rackU * l.qty; break;
      case "system":
        rackU += p.rackU * l.qty;
        cores += p.coresTotal * l.qty;
        memGb += p.memGb * l.qty;
        bf16 += p.bf16Tflops * l.qty;
        gpuCount += p.gpuCount * l.qty;
        break;
      default: break;
    }
  }

  const power = computePower(b);
  return {
    totalPkr, inHouseLines, sourcedLines, maxLeadDays, power, rackU,
    cores, threads, memGb, vramGb,
    storageTb: Math.round(storageTb * 100) / 100,
    fp32Tflops: Math.round(fp32 * 10) / 10,
    bf16Tflops: Math.round(bf16),
    gpuCount,
    // 1W of electrical draw becomes 3.412 BTU/hr of heat. All of it.
    heatBtuHr: Math.round(power.sustainedW * 3.412),
    counts,
  };
}

/* =============================================================== driver */

const RULES = [
  ruleCpuBoard, ruleCooling, ruleMemory, ruleGpus,
  ruleStorage, rulePower, ruleChassis, ruleFabric,
  ruleFacility, ruleHygiene,
  // What is absent, before what is wrong with what is present.
  ruleEssentials,
  // Last, because it checks the arrangement the other rules produced rather
  // than any single part, and its findings read best after the specific ones.
  ruleGeometry,
];

const SEV_ORDER = { error: 0, warn: 1, info: 2, gain: 3 } as const;

export function checkBuild(b: Build): CompatReport {
  const findings: Finding[] = [];
  for (const rule of RULES) {
    try {
      rule(b, findings);
    } catch {
      // A rule throwing must never take the whole configurator down.
    }
  }

  findings.sort((a, c) => SEV_ORDER[a.severity] - SEV_ORDER[c.severity] || a.rule.localeCompare(c.rule));

  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

  return {
    findings,
    summary: summarise(b),
    buildable: errors === 0 && b.lines.length > 0,
    errors,
    warns,
  };
}

export type { Build, BuildLine, Finding, CompatReport, BuildSummary } from "./types";
