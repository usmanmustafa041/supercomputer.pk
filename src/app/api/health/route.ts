import { NextResponse } from "next/server";
import { one, scalar } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";

/** Used by the container healthcheck, and handy for checking a deployment. */
export async function GET() {
  try {
    await ensureReady();
    const products = Number(await scalar<string>("SELECT count(*) FROM products"));
    const checks = await one<{ migrations:string; negative_inventory:string; database_bytes:string }>(`SELECT
      (SELECT count(*) FROM schema_migrations) migrations,
      (SELECT count(*) FROM inventory_balances WHERE on_hand<0 OR reserved<0 OR available<0) negative_inventory,
      pg_database_size(current_database()) database_bytes`);
    const healthy = Number(checks?.negative_inventory ?? 0) === 0;
    return NextResponse.json({ status: healthy ? "ok" : "degraded", products, migrations:Number(checks?.migrations??0), databaseBytes:Number(checks?.database_bytes??0), negativeInventory:Number(checks?.negative_inventory??0) }, { status: healthy ? 200 : 503 });
  } catch (e) {
    return NextResponse.json(
      { status: "error", detail: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
