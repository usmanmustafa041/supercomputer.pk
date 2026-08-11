import type { Kind, Product } from "../catalog/types";

export interface BuildLine {
  product: Product;
  qty: number;
}

/** A configuration under construction. Lines are grouped by kind on read. */
export interface Build {
  lines: BuildLine[];
  /** Deployment target — changes which rules apply and how hard they bite. */
  target: Target;
}

export type Target = "desk" | "rack" | "cluster";

export const TARGET_LABEL: Record<Target, string> = {
  desk: "Desk-side workstation",
  rack: "Rack-mounted node",
  cluster: "Multi-node cluster",
};

export type Severity = "error" | "warn" | "info" | "gain";

export interface Finding {
  /** Stable rule id, so the UI can dedupe and link to an explanation. */
  rule: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Product ids the finding is about — the UI highlights these lines. */
  refs: string[];
  /** What to do about it, when there is a concrete answer. */
  fix?: string;
}

export interface PowerBudget {
  /** Sum of sustained board/package power across every component. */
  sustainedW: number;
  /** Sustained plus transient headroom — what the PSU must actually survive. */
  peakW: number;
  /** Total PSU capacity, after redundancy is discounted. */
  suppliedW: number;
  /** Usable capacity given N+1 redundancy (one module assumed failed). */
  redundantW: number;
  headroomPct: number;
  /** Amps drawn from a 230V single-phase Pakistani supply. */
  amps230: number;
  /** Rough annual electricity cost at the going commercial tariff. */
  annualPkr: number;
}

export interface BuildSummary {
  totalPkr: number;
  /** Lines already on our shelf versus lines we would import for the order. */
  inHouseLines: number;
  sourcedLines: number;
  maxLeadDays: number;
  power: PowerBudget;
  rackU: number;
  cores: number;
  threads: number;
  memGb: number;
  vramGb: number;
  storageTb: number;
  fp32Tflops: number;
  bf16Tflops: number;
  gpuCount: number;
  /** Heat rejected into the room, which is the number that sizes the AC. */
  heatBtuHr: number;
  counts: Partial<Record<Kind, number>>;
}

export interface CompatReport {
  findings: Finding[];
  summary: BuildSummary;
  /** True when nothing at error severity remains. */
  buildable: boolean;
  errors: number;
  warns: number;
}
