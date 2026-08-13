import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import type { Page } from "../products/product.types";
import type { QuoteInput, QuoteRow, QuoteStatus } from "./quote.types";

function makeReference(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  return `SC-${stamp}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

@Injectable()
export class QuotesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(q: QuoteInput): Promise<QuoteRow> {
    const email = q.contact_email.toLowerCase();

    // Anonymous requests remain anonymous. Authenticated requests are linked to
    // the already-resolved session, never to an unverified email claim.
    const userId = q.userId ?? null;

    const rows = await this.db.query<QuoteRow>(
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

  async list(opts: { status?: string; page?: number; perPage?: number } = {}): Promise<Page<QuoteRow>> {
    const params: unknown[] = [];
    let clause = "";
    if (opts.status) {
      params.push(opts.status);
      clause = `WHERE status = $${params.length}`;
    }

    const total = Number(await this.db.scalar<string>(`SELECT count(*) FROM quotes ${clause}`, params));
    const perPage = Math.min(Math.max(opts.perPage ?? 25, 1), 100);
    const page = Math.max(opts.page ?? 1, 1);

    const items = await this.db.query<QuoteRow>(
      `SELECT * FROM quotes ${clause} ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, (page - 1) * perPage],
    );

    return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
  }

  findByReference(reference: string): Promise<QuoteRow | null> {
    return this.db.one<QuoteRow>("SELECT * FROM quotes WHERE reference = $1", [reference]);
  }

  /**
   * The requests belonging to one person.
   *
   * Matched on the account and on the email address, so a request sent before
   * signing up still appears once they have an account with the same address.
   */
  mine(userId: number): Promise<QuoteRow[]> {
    return this.db.query<QuoteRow>(
      `SELECT * FROM quotes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [userId],
    );
  }

  async update(
    reference: string,
    patch: { status?: QuoteStatus; internal_note?: string },
  ): Promise<QuoteRow | null> {
    const allowed = new Set(["status", "internal_note"]);
    const sets: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || !allowed.has(key)) continue;
      params.push(value);
      sets.push(`${key} = $${params.length}`);
    }
    if (!sets.length) return this.findByReference(reference);

    params.push(reference);
    const rows = await this.db.query<QuoteRow>(
      `UPDATE quotes SET ${sets.join(", ")} WHERE reference = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async countsByStatus(): Promise<Record<string, number>> {
    const rows = await this.db.query<{ status: string; n: string }>(
      "SELECT status, count(*) AS n FROM quotes GROUP BY status",
    );
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  }
}
