import { createHash } from "node:crypto";
import { z } from "zod";
import { checkBuild } from "@/lib/compat/engine";
import { publicProducts } from "@/lib/db/catalog";
import { notifyQuoteCreated } from "@/lib/notifications";
import { recentQuoteByHash, submitQuote } from "@/lib/db/quotes";
import type { QuoteLine } from "@/lib/db/types";
import { consumeRateLimit, opaqueKey, requestIp } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 32_768;

const schema = z.object({
  contact_name: z.string().trim().min(1).max(120),
  contact_email: z.string().trim().toLowerCase().email().max(254),
  organisation: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  timeline: z.string().trim().max(80).optional().default(""),
  target: z.enum(["desk", "rack", "cluster"]).default("desk"),
  workloads: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
  notes: z.string().trim().max(4_000).optional().default(""),
  lines: z.array(z.object({
    sku: z.string().trim().min(1).max(100),
    qty: z.number().int().min(1).max(32),
  }).strict()).max(40).default([]),
  // Humans never see or fill this field. Bots that populate every input do.
  website: z.string().max(0).optional().default(""),
}).strict();

function productSpecs(product: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...product };
  for (const key of [
    "id", "slug", "kind", "brand", "model", "mpn", "family", "condition", "segment",
    "price", "avail", "warrantyMonths", "releaseYear", "searchKey", "highlights", "tags",
  ]) delete copy[key];
  return copy;
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return Response.json({ error: "Request is too large." }, { status: 413 });

  const ip = requestIp(request);
  if (!await consumeRateLimit(opaqueKey("quote-ip", ip), 8, 60 * 60)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let json: unknown;
  try { json = JSON.parse(raw); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Check the submitted fields and try again." }, { status: 400 });
  }
  const body = parsed.data;
  if (body.website) return Response.json({ error: "Invalid request." }, { status: 400 });

  if (!await consumeRateLimit(opaqueKey("quote-email", body.contact_email), 4, 60 * 60)) {
    return Response.json({ error: "Too many requests for this email address." }, { status: 429 });
  }

  const catalog = await publicProducts();
  const bySku = new Map(catalog.map((product) => [product.id.toLowerCase(), product]));
  const buildLines = body.lines.map(({ sku, qty }) => {
    const product = bySku.get(sku.toLowerCase());
    return product ? { product, qty } : null;
  });
  if (buildLines.some((line) => line === null)) {
    return Response.json({ error: "One or more products are no longer available." }, { status: 409 });
  }
  const lines = buildLines.filter((line): line is NonNullable<typeof line> => line !== null);
  if (lines.some(({ product }) => product.avail.inHouse <= 0 && product.avail.leadDays <= 0 && !product.avail.indentOnly)) {
    return Response.json({ error: "One or more products are currently unavailable." }, { status: 409 });
  }

  const report = checkBuild({ lines, target: body.target });
  const snapshots: QuoteLine[] = lines.map(({ product, qty }) => ({
    sku: product.id,
    qty,
    brand: product.brand,
    model: product.model,
    kind: product.kind,
    condition: product.condition,
    unit_price_pkr: product.price.pkr,
    slug: product.slug,
    family: product.family,
    warranty_months: product.warrantyMonths,
    availability: {
      in_house: product.avail.inHouse,
      lead_days: product.avail.leadDays,
      indent_only: product.avail.indentOnly,
    },
    specs: productSpecs(product as unknown as Record<string, unknown>),
  }));
  const fingerprint = createHash("sha256").update(JSON.stringify({
    email: body.contact_email,
    target: body.target,
    lines: snapshots.map(({ sku, qty }) => ({ sku, qty })),
    notes: body.notes,
  })).digest("hex");
  const duplicate = await recentQuoteByHash(fingerprint);
  if (duplicate) return Response.json({ reference: duplicate.reference, duplicate: true }, { status: 200 });

  const quote = await submitQuote({
    contact_name: body.contact_name,
    contact_email: body.contact_email,
    organisation: body.organisation || null,
    phone: body.phone || null,
    city: body.city || null,
    timeline: body.timeline || null,
    target: body.target,
    workloads: body.workloads,
    notes: body.notes || null,
    lines: snapshots,
    subtotal_pkr: snapshots.reduce((sum, line) => sum + line.qty * Number(line.unit_price_pkr ?? 0), 0),
    summary: report.summary as unknown as Record<string, unknown>,
    findings: report.findings as unknown as Array<Record<string, unknown>>,
    submission_hash: fingerprint,
  });
  await notifyQuoteCreated({ reference: quote.reference, customerName: quote.contact_name, customerEmail: quote.contact_email });
  return Response.json({ reference: quote.reference }, { status: 201 });
}
