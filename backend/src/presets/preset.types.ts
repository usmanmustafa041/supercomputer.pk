export type PresetTarget = "desk" | "rack" | "cluster";

export interface PresetPick {
  /** Family key, which survives the catalogue being regenerated. */
  family: string;
  qty: number;
  /** Substring of the model name, pinning which member of the family. */
  variant?: string;
}

export interface PresetRow {
  id: number;
  slug: string;
  name: string;
  role: string;
  target: PresetTarget;
  blurb: string;
  picks: PresetPick[];
  position: number;
  is_active: boolean;
}
