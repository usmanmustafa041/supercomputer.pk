export type QuoteStatus = "new" | "in_review" | "quoted" | "won" | "lost";

export interface QuoteLine {
  sku: string;
  qty: number;
  brand?: string;
  model?: string;
  kind?: string;
  condition?: string;
}

export interface QuoteInput {
  userId?: number | null;
  contact_name: string;
  contact_email: string;
  organisation?: string | null;
  phone?: string | null;
  city?: string | null;
  timeline?: string | null;
  target?: string;
  workloads?: string[];
  notes?: string | null;
  lines?: QuoteLine[];
  summary?: Record<string, unknown>;
  findings?: Array<Record<string, unknown>>;
}

export interface QuoteRow {
  id: number;
  reference: string;
  user_id: number | null;
  contact_name: string;
  contact_email: string;
  organisation: string | null;
  phone: string | null;
  city: string | null;
  timeline: string | null;
  target: string;
  workloads: string[];
  notes: string | null;
  lines: QuoteLine[];
  summary: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
  status: QuoteStatus;
  internal_note: string | null;
  created_at: Date;
}
