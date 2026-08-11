/**
 * Re-verifies every claim in the retailer registry against the live web.
 *
 * Run this before shipping and whenever the registry is edited. It checks two
 * separate things, because they fail independently:
 *
 *   1. Does the host resolve and serve a real page over HTTPS?
 *   2. Does the search endpoint we ship actually return relevant results?
 *
 * Guessing (2) from the storefront platform is wrong often enough to matter —
 * one store's OpenCart route 401s while a plainer path works fine. Anything
 * this script cannot confirm should be downgraded in `retailers.ts` rather
 * than left claiming more than we know.
 *
 * Exit code is non-zero if a registry claim no longer holds.
 */

import { RETAILERS, VERIFIED_AT } from "../src/lib/sourcing/retailers";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const PROBE_QUERY = "rtx 4090";
const TIMEOUT = 20_000;

interface Probe {
  ok: boolean;
  status: number;
  bytes: number;
  finalUrl?: string;
  error?: string;
}

async function get(url: string): Promise<Probe> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    });
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, bytes: body.length, finalUrl: res.url };
  } catch (e) {
    const err = e as { cause?: { code?: string }; name?: string };
    return { ok: false, status: 0, bytes: 0, error: err.cause?.code ?? err.name ?? "failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function searchProbe(url: string): Promise<Probe & { relevant: boolean }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    });
    const body = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      bytes: body.length,
      finalUrl: res.url,
      // A page that ran the search echoes the term somewhere in its output.
      relevant: body.toLowerCase().includes("4090"),
    };
  } catch (e) {
    const err = e as { cause?: { code?: string }; name?: string };
    return { ok: false, status: 0, bytes: 0, relevant: false, error: err.cause?.code ?? err.name ?? "failed" };
  } finally {
    clearTimeout(timer);
  }
}

let drift = 0;

console.log(`Registry last verified ${VERIFIED_AT}. Re-checking ${RETAILERS.length} entries.\n`);

const queue = [...RETAILERS];
const rows: string[] = [];

await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (queue.length) {
      const r = queue.shift()!;
      const home = await get(r.url);
      const reachable = home.ok && home.bytes > 2000;

      let searchNote = "—";
      if (r.search) {
        const s = await searchProbe(r.search(PROBE_QUERY));
        const works = s.ok && s.relevant;
        searchNote = works ? "results" : s.ok ? `${s.status} no-echo` : `${s.status || s.error}`;
        if (r.searchVerified && !works) {
          rows.push(`  DRIFT ${r.id}: registry claims searchVerified, probe says ${searchNote}`);
          drift++;
        }
      }

      const claimsDirect = r.reach === "direct";
      if (claimsDirect && !reachable) {
        rows.push(`  DRIFT ${r.id}: registry claims reach="direct", got ${home.status || home.error}`);
        drift++;
      }
      if (!claimsDirect && reachable && r.reach === "waf-blocked") {
        rows.push(`  NOTE  ${r.id}: marked waf-blocked but responded ${home.status} — may be worth re-testing`);
      }

      console.log(
        `${reachable ? "up  " : "DOWN"}  ${r.id.padEnd(16)} ${String(home.status).padStart(3)}  ` +
          `search=${searchNote.padEnd(12)} ${r.host}`
      );
    }
  })
);

console.log("");
for (const row of rows) console.log(row);

if (drift === 0) {
  console.log("\nEvery registry claim still holds.");
  console.log(`Update VERIFIED_AT in src/lib/sourcing/retailers.ts to ${new Date().toISOString().slice(0, 10)}.`);
} else {
  console.log(`\n${drift} registry claim(s) no longer hold. Downgrade them in retailers.ts before shipping.`);
}

process.exit(drift === 0 ? 0 : 1);
