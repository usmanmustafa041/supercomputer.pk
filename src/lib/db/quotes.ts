/** Quote requests: anyone can send one, administrators work through them. */

import "server-only";
import { one, query, scalar } from "./client";
import { ensureReady } from "./init";
import type { Page, QuoteLine, QuoteRow, QuoteStatus } from "./types";

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
  submission_hash?: string;
  subtotal_pkr?: number;
}

export async function submitQuote(q: QuoteInput): Promise<QuoteRow> {
  await ensureReady();
  const email = q.contact_email.toLowerCase();

  // Linked to an account when the email matches one, so it shows up in their
  // history. Deliberately not required: nobody should need an account to ask
  // what something costs.
  const userId = await scalar<number>("SELECT id FROM users WHERE email = $1", [email]);
  const customer = await one<{ id: number }>(`INSERT INTO customers(customer_number,organisation,display_name,email,phone)
    VALUES(next_document_number('customer','CUS'),$1,$2,$3,$4)
    ON CONFLICT (lower(email)) WHERE email IS NOT NULL DO UPDATE SET
      organisation=COALESCE(EXCLUDED.organisation,customers.organisation), display_name=EXCLUDED.display_name,
      phone=COALESCE(EXCLUDED.phone,customers.phone), updated_at=now() RETURNING id`,
    [q.organisation ?? null,q.contact_name,email,q.phone ?? null]);
  const reference = await scalar<string>("SELECT next_document_number('quote','SCQ')");

  const rows = await query<QuoteRow>(
    `INSERT INTO quotes
       (reference, user_id, customer_id, contact_name, contact_email, organisation, phone, city,
        timeline, target, workloads, notes, lines, summary, findings, submission_hash, subtotal_pkr)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      reference, userId, customer?.id ?? null, q.contact_name, email, q.organisation ?? null,
      q.phone ?? null, q.city ?? null, q.timeline ?? null, q.target ?? "desk",
      JSON.stringify(q.workloads ?? []), q.notes ?? null,
      JSON.stringify(q.lines ?? []), JSON.stringify(q.summary ?? {}),
      JSON.stringify(q.findings ?? []), q.submission_hash ?? null, q.subtotal_pkr ?? 0,
    ],
  );
  return rows[0];
}

export async function createQuoteRevision(reference:string,actorId:number,note?:string):Promise<number>{
  await ensureReady();
  const quote=await getQuote(reference); if(!quote) throw new Error("Quote not found.");
  const revision=Number(quote.revision_number)+1;
  await query(`INSERT INTO quote_revisions(quote_id,revision_number,lines,summary,findings,subtotal_pkr,tax_rate,discount_pkr,valid_until,payment_terms,note,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[quote.id,revision,JSON.stringify(quote.lines),JSON.stringify(quote.summary),JSON.stringify(quote.findings),quote.subtotal_pkr,quote.tax_rate,quote.discount_pkr,quote.valid_until,quote.payment_terms,note??null,actorId]);
  await query("UPDATE quotes SET revision_number=$1,status='reviewing',updated_at=now() WHERE id=$2",[revision,quote.id]);
  return revision;
}

export async function quoteRevisions(reference:string){await ensureReady();return query<{revision_number:number;note:string|null;created_at:Date;actor_email:string|null}>(`SELECT r.revision_number,r.note,r.created_at,u.email actor_email FROM quote_revisions r JOIN quotes q ON q.id=r.quote_id LEFT JOIN users u ON u.id=r.created_by WHERE q.reference=$1 ORDER BY r.revision_number DESC`,[reference]);}

export async function recentQuoteByHash(hash: string): Promise<QuoteRow | null> {
  await ensureReady();
  return one<QuoteRow>(
    `SELECT * FROM quotes
      WHERE submission_hash = $1 AND created_at > now() - interval '10 minutes'
      ORDER BY created_at DESC LIMIT 1`,
    [hash],
  );
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
  patch: {
    status?: QuoteStatus;
    internal_note?: string | null;
    lines?: QuoteLine[];
    subtotal_pkr?: number;
    tax_rate?: number;
    discount_pkr?: number;
    valid_until?: string | null;
    payment_terms?: string | null;
    sent_at?: Date | null;
  },
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
  if (patch.lines !== undefined) {
    params.push(JSON.stringify(patch.lines));
    sets.push(`lines = $${params.length}`);
  }
  for (const key of ["subtotal_pkr", "tax_rate", "discount_pkr"] as const) {
    if (patch[key] !== undefined) {
      params.push(patch[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (patch.valid_until !== undefined) {
    params.push(patch.valid_until || null);
    sets.push(`valid_until = $${params.length}`);
  }
  if (patch.payment_terms !== undefined) {
    params.push(patch.payment_terms);
    sets.push(`payment_terms = $${params.length}`);
  }
  if (patch.sent_at !== undefined) { params.push(patch.sent_at); sets.push(`sent_at = $${params.length}`); }
  if (!sets.length) return;

  params.push(reference);
  await query(`UPDATE quotes SET ${sets.join(", ")}, updated_at = now() WHERE reference = $${params.length}`, params);
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
  invoicesTotal: number;
  invoicesOutstanding: number;
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
      (SELECT count(*) FROM users)                           AS users_total,
      (SELECT count(*) FROM invoices)                        AS invoices_total,
      (SELECT count(*) FROM invoices WHERE status IN ('draft','sent')) AS invoices_outstanding
  `);
  return {
    productsTotal: Number(row?.products_total ?? 0),
    productsActive: Number(row?.products_active ?? 0),
    productsInStock: Number(row?.products_in_stock ?? 0),
    quotesTotal: Number(row?.quotes_total ?? 0),
    quotesNew: Number(row?.quotes_new ?? 0),
    usersTotal: Number(row?.users_total ?? 0),
    invoicesTotal: Number(row?.invoices_total ?? 0),
    invoicesOutstanding: Number(row?.invoices_outstanding ?? 0),
  };
}
