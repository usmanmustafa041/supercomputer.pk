import { createHash, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db/client";

function allowed(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!allowed(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await query<{ id: string }>("DELETE FROM sessions WHERE expires_at < now() RETURNING token AS id");
  const resets = await query<{ id: string }>("DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL RETURNING token_hash AS id");
  await query("DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'");
  return Response.json({ removedSessions: sessions.length, removedResetTokens: resets.length });
}
