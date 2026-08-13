/**
 * Merges the base and extended family sets into the arrays the expander reads.
 * Kept separate so `families-ext.ts` can import types from `families.ts`
 * without a circular value dependency.
 */

import * as base from "./families";
import * as ext from "./families-ext";

export const GPUS = [...base.GPUS, ...ext.GPUS_EXT];
export const CPUS = [...base.CPUS, ...ext.CPUS_EXT];
export const MOBOS = [...base.MOBOS, ...ext.MOBOS_EXT];
export const MEMORY = [...base.MEMORY, ...ext.MEMORY_EXT];
export const STORAGE = [...base.STORAGE, ...ext.STORAGE_EXT];
export const PSUS = [...base.PSUS, ...ext.PSUS_EXT];
export const COOLERS = [...base.COOLERS, ...ext.COOLERS_EXT];
export const CHASSIS = [...base.CHASSIS, ...ext.CHASSIS_EXT];
export const NICS = [...base.NICS, ...ext.NICS_EXT];
export const SWITCHES = [...base.SWITCHES, ...ext.SWITCHES_EXT];
export const OPTICS = [...base.OPTICS, ...ext.OPTICS_EXT];
export const RACKS = [...base.RACKS, ...ext.RACKS_EXT];
export const PDUS = [...base.PDUS, ...ext.PDUS_EXT];
export const UPSES = [...base.UPSES, ...ext.UPSES_EXT];
export const SYSTEMS = [...base.SYSTEMS, ...ext.SYSTEMS_EXT];

export type {
  ChassisFamily, CoolerFamily, CpuFamily, FamilyBase, GpuFamily, MemFamily,
  MoboFamily, NicFamily, OpticFamily, PduFamily, PsuFamily, RackFamily,
  StorageFamily, SwitchFamily, SystemFamily, UpsFamily,
} from "./families";
