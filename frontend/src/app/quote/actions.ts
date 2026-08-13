"use server";

/**
 * Sending a quote request.
 *
 * This used to compose a mailto: draft, from before there was anywhere to put
 * a request. There is now: it goes to the API, which re-resolves every SKU
 * against the catalogue, re-runs the compatibility engine, and stores the
 * result. The reference comes back from the database rather than being invented
 * in the browser, so the number the customer sees is the one an administrator
 * can look up.
 *
 * Only the SKU and the quantity of each line are sent. Everything else about a
 * part, and the whole summary and findings, is worked out on the server, so a
 * caller cannot describe a part into existence or claim a build passes when it
 * does not.
 */

import { ApiError } from "@/lib/api/client";
import { quotes } from "@/lib/api/resources";

export type QuoteState =
  | { ok: true; reference: string }
  | { ok: false; error: string }
  | undefined;

export async function submitQuote(_prev: QuoteState, form: FormData): Promise<QuoteState> {
  const name = String(form.get("contact_name") ?? "").trim();
  const email = String(form.get("contact_email") ?? "").trim();

  // Checked here too so the message arrives without a round trip. The API
  // enforces the same rules and its answer is the one that counts.
  if (name.length < 2) return { ok: false, error: "Please give us a name to address the quotation to." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "That does not look like an email address." };
  }

  let lines: Array<{ sku: string; qty: number }>;
  try {
    const parsed = JSON.parse(String(form.get("lines") ?? "[]"));
    lines = (Array.isArray(parsed) ? parsed : [])
      .filter((l) => typeof l?.sku === "string" && l.sku)
      .map((l) => ({ sku: String(l.sku), qty: Math.max(1, Math.round(Number(l.qty)) || 1) }));
  } catch {
    return { ok: false, error: "Could not read the configuration. Reload the page and try again." };
  }
  if (lines.length === 0) {
    return { ok: false, error: "There is nothing to quote yet. Put a configuration together first." };
  }

  const workloads = String(form.get("workloads") ?? "")
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);

  try {
    const saved = await quotes.submit({
      contact_name: name,
      contact_email: email,
      organisation: String(form.get("organisation") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      city: String(form.get("city") ?? "").trim() || undefined,
      timeline: String(form.get("timeline") ?? "").trim() || undefined,
      target: String(form.get("target") ?? "desk"),
      workloads,
      notes: String(form.get("notes") ?? "").trim() || undefined,
      lines,
    });
    return { ok: true, reference: saved.reference };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 429) {
        return { ok: false, error: "That is a lot of requests at once. Wait a minute and try again." };
      }
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "We could not reach the server. Try again in a moment." };
  }
}
