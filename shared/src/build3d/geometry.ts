/**
 * Build geometry.
 *
 * Turns catalog specs into to-scale boxes and mount transforms. The point of
 * doing it this way rather than shipping a model library: the geometry *is*
 * the compatibility data. A card 30mm longer than the chassis clearance is
 * drawn 30mm too long and visibly punches through the front panel, you see
 * the problem rather than reading about it.
 *
 * Units are millimetres throughout. The renderer divides by MM_PER_UNIT.
 * Pure functions only, no React, no three.
 */

import type { Chassis, Cooler, Cpu, Gpu, Kind, Memory, Motherboard, Product, Psu, Storage } from "../catalog/types";

/** Scene units are decimetres, so a 450mm case is 4.5 units across. */
export const MM_PER_UNIT = 100;

/** How far into a rack chassis the front drive bays reach. */
const DRIVE_BAY_DEPTH = 115;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Box {
  /** Size in mm along each axis. */
  size: Vec3;
  /** Centre position in mm, in chassis interior space. */
  pos: Vec3;
  /** Rotation in radians about each axis. */
  rot?: Vec3;
}

/**
 * Chassis interior space:
 *   x, left to right, 0 at the left wall
 *   y, bottom to top, 0 at the floor
 *   z, front to back, 0 at the front panel
 */
export interface Interior {
  width: number;
  height: number;
  depth: number;
  /** True for rack form factors, which lay the board flat instead of upright. */
  rack: boolean;
  /** Where the motherboard tray sits. */
  trayZ: number;
}

const PCIE_PITCH = 20.32; // slot-to-slot spacing, ATX standard
const CARD_HEIGHT = 112; // full-height PCIe card, bracket excluded
const RACK_WIDTH = 440; // 19" rack usable interior
const RACK_U = 44.45;

/** Board outline per form factor, in mm. */
const BOARD_SIZE: Record<string, { w: number; h: number }> = {
  itx: { w: 170, h: 170 },
  matx: { w: 244, h: 244 },
  atx: { w: 305, h: 244 },
  "ssi-ceb": { w: 305, h: 267 },
  eatx: { w: 305, h: 330 },
  "ssi-eeb": { w: 305, h: 330 },
  proprietary: { w: 330, h: 330 },
};

/**
 * Interior volume of a chassis.
 *
 * Rack heights come straight from the U count. Tower width is derived from the
 * cooler clearance, because in a tower the CPU cooler height *is* the width
 * constraint, that is the number the spec sheet actually gives you.
 */
export function interiorOf(chassis: Chassis | null, target: "desk" | "rack" | "cluster" = "desk"): Interior {
  if (!chassis) {
    // Before a case is chosen the deployment target decides the shape of the
    // empty volume. Without this the viewport showed a tower no matter which
    // target was selected, which made the target buttons look inert.
    if (target === "rack") return { width: RACK_WIDTH, height: 4 * RACK_U, depth: 700, rack: true, trayZ: 60 };
    if (target === "cluster") return { width: RACK_WIDTH, height: 8 * RACK_U, depth: 800, rack: true, trayZ: 60 };
    return { width: 220, height: 480, depth: 460, rack: false, trayZ: 40 };
  }

  if (chassis.rackU > 0) {
    return {
      width: RACK_WIDTH,
      height: chassis.rackU * RACK_U,
      depth: chassis.depthMm,
      rack: true,
      trayZ: 60,
    };
  }

  if (chassis.form === "open-frame") {
    return {
      width: Math.max(300, chassis.maxGpuLengthMm * 0.8),
      height: 120 + chassis.maxGpus * 45,
      depth: chassis.depthMm,
      rack: false,
      trayZ: 30,
    };
  }

  return {
    width: chassis.maxCoolerHeightMm + 55,
    height: chassis.expansionSlots * PCIE_PITCH + 300,
    depth: chassis.depthMm,
    rack: false,
    trayZ: 40,
  };
}

/* -------------------------------------------------------------- part boxes */

export function boardBox(mb: Motherboard, it: Interior): Box {
  const s = BOARD_SIZE[mb.form] ?? BOARD_SIZE.atx;
  // Thickness stands in for the PCB plus standoffs plus rear I/O shield, which
  // is what you actually perceive as "the board", a true 1.6mm PCB renders as
  // an invisible sliver.
  if (it.rack) {
    /*
     * Laid flat on the floor at the rear, against the left wall.
     *
     * It used to be pushed against the right wall, which is where the supplies
     * go, so in every rack node the board and the power supplies occupied the
     * same volume: about 70mm of overlap, drawn as two solids intersecting.
     * The supply bay is the fixed thing in a real chassis, so the board is what
     * moves.
     */
    return {
      size: { x: s.h, y: 12, z: s.w },
      pos: { x: s.h / 2 + 15, y: 8, z: it.depth - s.w / 2 - 30 },
    };
  }
  // Upright against the right-hand wall, viewed through the window.
  return {
    size: { x: 14, y: s.h, z: s.w },
    pos: { x: 16, y: it.height - s.h / 2 - 40, z: it.trayZ + s.w / 2 },
  };
}

export function cpuBox(cpu: Cpu, mb: Motherboard | null, it: Interior, index = 0): Box {
  const big = /SP5|SP3|LGA4677|LGA3647|sTR5|sWRX8/.test(cpu.socket);
  const side = big ? 75 : 40;
  const board = mb ? boardBox(mb, it) : null;
  const offset = index * (side + 40);

  if (it.rack) {
    return {
      size: { x: side, y: 6, z: side },
      pos: {
        x: (board?.pos.x ?? it.width / 2) - 30,
        y: (board?.pos.y ?? 4) + 5,
        z: (board?.pos.z ?? it.depth / 2) + 60 - offset,
      },
    };
  }
  return {
    size: { x: 6, y: side, z: side },
    pos: {
      x: (board?.pos.x ?? 16) + 10,
      y: (board?.pos.y ?? it.height / 2) + 55 - offset,
      z: (board?.pos.z ?? it.depth / 2) - 30,
    },
  };
}

export function coolerBox(cooler: Cooler, cpu: Box, it: Interior): Box {
  const isAio = cooler.type === "aio";
  if (isAio) {
    // Pump block on the die; the radiator is placed separately at the front.
    return { size: { x: it.rack ? 90 : 45, y: it.rack ? 45 : 90, z: 90 }, pos: { ...cpu.pos } };
  }
  const h = Math.max(30, cooler.heightMm);
  if (it.rack) {
    return {
      size: { x: 100, y: h, z: 100 },
      pos: { x: cpu.pos.x, y: cpu.pos.y + h / 2 + 3, z: cpu.pos.z },
    };
  }
  return {
    size: { x: h, y: 110, z: 110 },
    pos: { x: cpu.pos.x + h / 2 + 3, y: cpu.pos.y, z: cpu.pos.z },
  };
}

export function radiatorBox(cooler: Cooler, it: Interior): Box | null {
  if (cooler.type !== "aio" || !cooler.radiatorMm) return null;
  const len = cooler.radiatorMm;
  return {
    size: { x: 30, y: len, z: 120 },
    pos: { x: it.width - 22, y: Math.min(it.height - len / 2 - 20, it.height / 2), z: it.depth / 2 },
  };
}

export function dimmBoxes(mem: Memory, qty: number, mb: Motherboard | null, it: Interior): Box[] {
  const count = Math.min(mem.modules * qty, mb?.memSlots ?? 12);
  const board = mb ? boardBox(mb, it) : null;
  const h = Math.max(31, mem.heightMm);
  const out: Box[] = [];

  for (let i = 0; i < count; i++) {
    if (it.rack) {
      out.push({
        size: { x: 133, y: h, z: 4 },
        pos: {
          x: (board?.pos.x ?? it.width / 2) + 10,
          y: (board?.pos.y ?? 4) + h / 2 + 3,
          z: (board?.pos.z ?? it.depth / 2) - 40 - i * 9,
        },
      });
    } else {
      out.push({
        size: { x: h, y: 133, z: 4 },
        pos: {
          x: (board?.pos.x ?? 16) + h / 2 + 6,
          y: (board?.pos.y ?? it.height / 2) - 20,
          z: (board?.pos.z ?? it.depth / 2) + 60 + i * 9,
        },
      });
    }
  }
  return out;
}

/**
 * Accelerator placement. Cards stack down the slot rail at their true
 * thickness, so a triple-slot cooler eats three positions on screen exactly as
 * it does in the case.
 */
export function gpuBoxes(gpu: Gpu, qty: number, it: Interior, startSlot = 0): Box[] {
  const out: Box[] = [];
  const thickness = Math.max(1, gpu.slotsWide) * PCIE_PITCH;
  const len = gpu.lengthMm || 200;

  for (let i = 0; i < qty; i++) {
    const slot = startSlot + i * Math.max(1, Math.round(gpu.slotsWide));
    if (it.rack) {
      /*
       * In the front half, behind the drive bays, which is where the riser
       * cages are in a real GPU node.
       *
       * They used to sit at the rear on top of the board, so the cards
       * intersected the processor, its cooler and the memory: three collisions
       * reported on a configuration we sell as a standard product. Cards go in
       * front of the board, not through it.
       */
      out.push({
        size: { x: thickness, y: CARD_HEIGHT, z: len },
        pos: {
          x: 60 + slot * PCIE_PITCH + thickness / 2,
          y: CARD_HEIGHT / 2 + 12,
          z: DRIVE_BAY_DEPTH + 20 + len / 2,
        },
      });
    } else {
      out.push({
        size: { x: CARD_HEIGHT, y: thickness, z: len },
        pos: {
          x: CARD_HEIGHT / 2 + 24,
          // 300, not 190. The first slot used to sit level with the processor,
          // so in every tower the top card intersected the cooler and the
          // memory. On a real ATX board the slots start well below the socket.
          y: it.height - 300 - slot * PCIE_PITCH - thickness / 2,
          z: it.trayZ + len / 2 + 10,
        },
      });
    }
  }
  return out;
}

export function psuBox(psu: Psu, it: Interior): Box {
  const dims: Record<string, { w: number; h: number }> = {
    atx: { w: 150, h: 86 },
    sfx: { w: 125, h: 63.5 },
    "sfx-l": { w: 125, h: 63.5 },
    crps: { w: 73.5, h: 40 },
    "redundant-1u": { w: 73.5, h: 40 },
    "redundant-2u": { w: 73.5, h: 81 },
  };
  const d = dims[psu.form] ?? dims.atx;
  const depth = Math.max(100, psu.depthMm);

  if (it.rack) {
    return {
      size: { x: d.w, y: d.h, z: depth },
      pos: { x: it.width - d.w / 2 - 15, y: d.h / 2 + 6, z: it.depth - depth / 2 - 10 },
    };
  }
  return {
    size: { x: d.w, y: d.h, z: depth },
    pos: { x: it.width / 2, y: d.h / 2 + 15, z: it.depth - depth / 2 - 20 },
  };
}

export function storageBoxes(drive: Storage, qty: number, it: Interior, start = 0): Box[] {
  const out: Box[] = [];
  const m2 = drive.bus === "m2-nvme";
  const big = drive.physical.startsWith("3.5");
  const size = m2
    ? { x: 22, y: 3, z: drive.physical === "22110" ? 110 : 80 }
    : big
      ? { x: 101, y: 26, z: 147 }
      : { x: 70, y: drive.physical.includes("15mm") ? 15 : 7, z: 100 };

  /**
   * 24, which is the most bays any chassis in the catalogue has.
   *
   * It was 12, so asking for 24 drives drew half of them and said nothing: the
   * picture quietly disagreed with the parts list. There is still a ceiling
   * because the drawing has to stop somewhere, but anything past this point has
   * already been reported by the port and bay checks, so the picture is not the
   * only thing telling you.
   */
  const DRAWN_MAX = 24;

  for (let i = 0; i < Math.min(qty, DRAWN_MAX); i++) {
    const n = start + i;
    if (m2) {
      // Clamped at the floor. In a tower these stack downward from a point
      // 300mm below the lid, which walks below the base of a short case by the
      // fifth drive: the smallest interior we sell is 361mm, so drive five
      // lands at -3mm and falls through the floor.
      const deskY = Math.max(size.y / 2 + 4, it.height - 300 - n * 16);
      out.push({
        size,
        pos: {
          x: it.rack ? it.width - 60 : 60,
          y: it.rack ? 12 : deskY,
          z: 140 + (it.rack ? n * 30 : 0),
        },
      });
    } else {
      const perRow = it.rack ? 8 : 4;
      const col = n % perRow;
      const row = Math.floor(n / perRow);
      out.push({
        size,
        pos: it.rack
          ? {
              // Half the width plus a margin, not a bare margin: pos is the
              // centre of the box, so `x: 30` put the left face of a 70mm drive
              // at -5 and every rack configuration had its first drive column
              // poking through the side wall. The other two axes always had
              // this right, which is why it went unnoticed.
              x: size.x / 2 + 15 + col * (size.x + 6),
              y: size.y / 2 + 8 + row * (size.y + 6),
              z: size.z / 2 + 15,
            }
          : { x: it.width / 2, y: 120 + row * (size.y + 8), z: size.z / 2 + 25 + col * 2 },
      });
    }
  }
  return out;
}

/* --------------------------------------------------------------- fit tests */

export interface Placement {
  /** Product this box belongs to. */
  id: string;
  kind: Kind;
  label: string;
  box: Box;
  /** True when the box escapes the chassis interior, a visible fit failure. */
  clips: boolean;
  /**
   * Mounted flat on the board rather than occupying its own space.
   *
   * An M.2 drive lives in a slot on the motherboard, underneath whatever card
   * is above it. That is how the boards are built, so treating the two as
   * fighting for space would flag a normal tower on every configuration.
   */
  attached?: boolean;
}

/** Does the box stay inside the interior volume, with a 2mm tolerance? */
export function fitsInside(box: Box, it: Interior): boolean {
  const t = 2;
  return (
    box.pos.x - box.size.x / 2 >= -t &&
    box.pos.x + box.size.x / 2 <= it.width + t &&
    box.pos.y - box.size.y / 2 >= -t &&
    box.pos.y + box.size.y / 2 <= it.height + t &&
    box.pos.z - box.size.z / 2 >= -t &&
    box.pos.z + box.size.z / 2 <= it.depth + t
  );
}

/**
 * Lays out every line in a build. Order matters: the board anchors the CPU,
 * the CPU anchors the cooler, and accelerators walk down the slot rail.
 */
export function layout(
  lines: Array<{ product: Product; qty: number }>,
  target: "desk" | "rack" | "cluster" = "desk"
): {
  interior: Interior;
  placements: Placement[];
} {
  const get = <K extends Kind>(k: K) =>
    lines.filter((l) => l.product.kind === k) as Array<{ product: Extract<Product, { kind: K }>; qty: number }>;

  const chassis = get("chassis")[0]?.product ?? null;
  const it = interiorOf(chassis, target);
  const mb = get("motherboard")[0]?.product ?? null;
  const placements: Placement[] = [];

  /**
   * Without a chassis there is nothing to not fit inside.
   *
   * `interiorOf(null)` returns an indicative volume so the scene has somewhere
   * to put things before a case is chosen. Measuring against it produced parts
   * drawn red and labelled "does not fit" when the only thing missing was the
   * case, and a viewport badge claiming a conflict the checks panel knew
   * nothing about. "Does not fit" is a claim about a real enclosure.
   */
  const measurable = chassis !== null;

  const add = (id: string, kind: Kind, label: string, box: Box, attached = false) =>
    placements.push({ id, kind, label, box, clips: measurable && !fitsInside(box, it), attached });

  if (mb) add(mb.id, "motherboard", mb.model, boardBox(mb, it));

  const cpuLines = get("cpu");
  const cpuBoxes: Box[] = [];
  let cpuIndex = 0;
  for (const { product, qty } of cpuLines) {
    for (let i = 0; i < qty; i++) {
      const b = cpuBox(product, mb, it, cpuIndex++);
      cpuBoxes.push(b);
      add(product.id, "cpu", product.model, b);
    }
  }

  let coolerIndex = 0;
  for (const { product, qty } of get("cooler")) {
    if (product.tdpRatingW === 0) continue; // thermal paste and the like
    for (let i = 0; i < qty; i++) {
      const anchor = cpuBoxes[coolerIndex++] ?? cpuBox({ socket: "" } as Cpu, mb, it, 0);
      add(product.id, "cooler", product.model, coolerBox(product, anchor, it));
      const rad = radiatorBox(product, it);
      if (rad) add(product.id, "cooler", `${product.model} radiator`, rad);
    }
  }

  for (const { product, qty } of get("memory")) {
    for (const b of dimmBoxes(product, qty, mb, it)) add(product.id, "memory", product.model, b);
  }

  let slot = 0;
  for (const { product, qty } of get("gpu")) {
    for (const b of gpuBoxes(product, qty, it, slot)) add(product.id, "gpu", product.model, b);
    slot += qty * Math.max(1, Math.round(product.slotsWide));
  }

  for (const { product, qty } of get("psu")) {
    for (let i = 0; i < qty; i++) {
      const b = psuBox(product, it);
      b.pos.z -= i * (b.size.z + 8);
      add(product.id, "psu", product.model, b);
    }
  }

  let driveIndex = 0;
  for (const { product, qty } of get("storage")) {
    const onBoard = product.bus === "m2-nvme";
    for (const b of storageBoxes(product, qty, it, driveIndex)) add(product.id, "storage", product.model, b, onBoard);
    driveIndex += qty;
  }

  return { interior: it, placements };
}

/** Empty mount points, drawn as ghosts so it is obvious where things go. */
export function ghosts(
  lines: Array<{ product: Product; qty: number }>,
  target: "desk" | "rack" | "cluster" = "desk"
): Array<{ kind: Kind; label: string; box: Box }> {
  const present = new Set(lines.map((l) => l.product.kind));
  const chassis = (lines.find((l) => l.product.kind === "chassis")?.product as Chassis | undefined) ?? null;
  const it = interiorOf(chassis, target);
  const out: Array<{ kind: Kind; label: string; box: Box }> = [];

  if (!present.has("motherboard")) {
    const s = BOARD_SIZE.atx;
    out.push({
      kind: "motherboard",
      label: "Motherboard",
      box: it.rack
        ? { size: { x: s.h, y: 3, z: s.w }, pos: { x: it.width - s.h / 2 - 20, y: 4, z: it.depth - s.w / 2 - 30 } }
        : { size: { x: 14, y: s.h, z: s.w }, pos: { x: 16, y: it.height - s.h / 2 - 40, z: it.trayZ + s.w / 2 } },
    });
  }
  if (!present.has("psu")) {
    out.push({
      kind: "psu",
      label: "Power supply",
      box: it.rack
        ? { size: { x: 150, y: 86, z: 160 }, pos: { x: it.width - 90, y: 49, z: it.depth - 90 } }
        : { size: { x: 150, y: 86, z: 160 }, pos: { x: it.width / 2, y: 58, z: it.depth - 100 } },
    });
  }
  if (!present.has("gpu")) {
    const b = gpuBoxes(
      { slotsWide: 2, lengthMm: 280 } as Gpu,
      1,
      it,
      0
    )[0];
    out.push({ kind: "gpu", label: "Accelerator", box: b });
  }
  if (!present.has("storage")) {
    out.push({
      kind: "storage",
      label: "Storage",
      box: it.rack
        ? { size: { x: 70, y: 15, z: 100 }, pos: { x: 65, y: 16, z: 65 } }
        : { size: { x: 70, y: 15, z: 100 }, pos: { x: it.width / 2, y: 128, z: 75 } },
    });
  }
  return out;
}
