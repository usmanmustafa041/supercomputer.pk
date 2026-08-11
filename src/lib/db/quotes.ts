/** Quote requests: anyone can send one, administrators work through them. */

import "server-only";
import { randomBytes } from "node:crypto";
import { one, query, scalar } from "./client";
import { ensureReady } from "./init";
import type { Page, QuoteLine, QuoteRow, QuoteStatus } from "./types";

function makeReference(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  return `SC-${stamp}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export interface QuoteInput {
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

export async function submitQuote(q: QuoteInput): Promise<QuoteRow> {
  await ensureReady();
  const email = q.contact_email.toLowerCase();

  // Linked to an account when the email matches one, so it shows up in their
  // history. Deliberately not required: nobody should need an account to ask
  // what something costs.
  const userId = await scalar<number>("SELECT id FROM users WHERE email = $1", [email]);

  const rows = await query<QuoteRow>(
    `INSERT INTO quotes
       (reference, user_id, contact_name, contact_email, organisation, phone, city,
        timeline, target, workloads, notes, lines, summary, findings)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      makeReference(), userId, q.contact_name, email, q.organisation ?? null,
      q.phone ?? null, q.city ?? null, q.timeline ?? null, q.target ?? "desk",
      JSON.stringify(q.workloads ?? []), q.notes ?? null,
      JSON.stringify(q.lines ?? []), JSON.stringify(q.summary ?? {}),
      JSON.stringify(q.findings ?? []),
    ],
  );
  return rows[0];
}

export async function listQuotes(
  opts: { status?: string; page?: number; perPage?: number } = {},
): Promise<Page<QuoteRow>> {
  await ensureReady();

  const params: unknown[] = [];
  let clause = "";
  if (opts.status) {
    params.push(opts.status);
    clause = `WHERE status = $${params.length}`;
  }

  const total = Number(await scalar<string>(`SELECT count(*) FROM quotes ${clause}`, params));
  const perPage = Math.min(Math.max(opts.perPage ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);

  const items = await query<QuoteRow>(
    `SELECT * FROM quotes ${clause} ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );

  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getQuote(reference: string): Promise<QuoteRow | null> {
  await ensureReady();
  return one<QuoteRow>("SELECT * FROM quotes WHERE reference = $1", [reference]);
}

export async function updateQuote(
  reference: string,
  patch: { status?: QuoteStatus; internal_note?: string | null },
): Promise<void> {
  await ensureReady();

  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.status !== undefined) {
    params.push(patch.status);
    sets.push(`status = $${params.length}`);
  }
  if (patch.internal_note !== undefined) {
    params.push(patch.internal_note);
    sets.push(`internal_note = $${params.length}`);
  }
  if (!sets.length) return;

  params.push(reference);
  await query(`UPDATE quotes SET ${sets.join(", ")} WHERE reference = $${params.length}`, params);
}

/**
 * A signed-in customer's own requests.
 *
 * Matched on the email as well as the account id, so a request sent before they
 * registered still appears once they sign up with that address.
 */
export async function quotesForUser(userId: number, email: string): Promise<QuoteRow[]> {
  await ensureReady();
  return query<QuoteRow>(
    `SELECT * FROM quotes WHERE user_id = $1 OR contact_email = $2
      ORDER BY created_at DESC LIMIT 50`,
    [userId, email.toLowerCase()],
  );
}

export interface Stats {
  productsTotal: number;
  productsActive: number;
  productsInStock: number;
  quotesTotal: number;
  quotesNew: number;
  usersTotal: number;
}

export async function stats(): Promise<Stats> {
  await ensureReady();
  // One trip rather than six.
  const row = await one<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM products)                        AS products_total,
      (SELECT count(*) FROM products WHERE is_active)        AS products_active,
      (SELECT count(*) FROM products WHERE stock_qty > 0)    AS products_in_stock,
      (SELECT count(*) FROM quotes)                          AS quotes_total,
      (SELECT count(*) FROM quotes WHERE status = 'new')     AS quotes_new,
      (SELECT count(*) FROM users)                           AS users_total
  `);
  return {
    productsTotal: Number(row?.products_total ?? 0),
    productsActive: Number(row?.products_active ?? 0),
    productsInStock: Number(row?.products_in_stock ?? 0),
    quotesTotal: Number(row?.quotes_total ?? 0),
    quotesNew: Number(row?.quotes_new ?? 0),
    usersTotal: Number(row?.users_total ?? 0),
  };
}
