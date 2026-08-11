import { NextResponse } from "next/server";
import { scalar } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";

/** Used by the container healthcheck, and handy for checking a deployment. */
export async function GET() {
  try {
    await ensureReady();
    const products = Number(await scalar<string>("SELECT count(*) FROM products"));
    return NextResponse.json({ status: "ok", products });
  } catch (e) {
    return NextResponse.json(
      { status: "error", detail: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
