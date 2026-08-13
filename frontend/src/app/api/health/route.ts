import { NextResponse } from "next/server";
import { api } from "@/lib/api/client";

/**
 * Is the web tier able to do its job?
 *
 * Which means: is it running, and can it reach the API. It deliberately does
 * not check the database or the object store, because it has no way to and
 * should not: the API's own health endpoint reports on those, and asking a
 * process about a dependency it cannot see would only produce a guess.
 */
export async function GET() {
  try {
    const upstream = await api<{ status: string; database: boolean; storage: boolean }>("/health");
    return NextResponse.json({ status: "ok", api: upstream });
  } catch {
    return NextResponse.json(
      { status: "error" },
      { status: 503 },
    );
  }
}
