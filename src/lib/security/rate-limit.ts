import "server-only";
import { createHash } from "node:crypto";
import { one, query } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function opaqueKey(namespace: string, value: string): string {
  return `${namespace}:${createHash("sha256").update(value).digest("hex")}`;
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  await ensureReady();
  const row = await one<{ hits: number }>(
    `INSERT INTO rate_limits (key, window_start, hits)
     VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       window_start = CASE
         WHEN rate_limits.window_start < now() - ($2 || ' seconds')::interval THEN now()
         ELSE rate_limits.window_start
       END,
       hits = CASE
         WHEN rate_limits.window_start < now() - ($2 || ' seconds')::interval THEN 1
         ELSE rate_limits.hits + 1
       END
     RETURNING hits`,
    [key, String(windowSeconds)],
  );
  // Opportunistic cleanup prevents this tiny table growing forever.
  if (Math.random() < 0.01) {
    await query("DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'");
  }
  return Number(row?.hits ?? limit + 1) <= limit;
}
