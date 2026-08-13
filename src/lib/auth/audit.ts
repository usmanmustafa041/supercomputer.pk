import "server-only";
import { headers } from "next/headers";
import { query } from "@/lib/db/client";
import { opaqueKey } from "@/lib/security/rate-limit";

export async function audit(actorId: number | null, action: string, target?: string, details: Record<string, unknown> = {}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  await query(
    `INSERT INTO admin_audit_log (actor_id, action, target, details, ip_hash)
     VALUES ($1,$2,$3,$4,$5)`,
    [actorId, action, target ?? null, JSON.stringify(details), opaqueKey("ip", ip)],
  );
}

export interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  created_at: Date;
}

export async function recentAuditEntries(limit = 100): Promise<AuditEntry[]> {
  return query<AuditEntry>(
    `SELECT l.id::text, u.email AS actor_email, l.action, l.target, l.details, l.created_at
       FROM admin_audit_log l LEFT JOIN users u ON u.id = l.actor_id
      ORDER BY l.created_at DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 250)],
  );
}
