/**
 * Quote requests: anyone can send one, administrators work through them.
 *
 * The interesting part is that the server does not take the browser's word for
 * what a configuration contains or whether it works.
 *
 * The configurator runs the compatibility engine on every click, because a
 * network round trip per click would make it feel broken. That answer is a
 * preview. When the request is actually submitted, this re-resolves every SKU
 * against the catalogue and re-runs the same engine on the result, and it is
 * the server's summary and findings that are stored. A caller who posts a
 * fabricated summary claiming 2kW of headroom gets the real numbers recorded
 * against their request.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { checkBuild, type BuildLine, type Target } from "@supercomputers/shared";
import type { Page } from "../products/product.types";
import { ProductsService } from "../products/products.service";
import { AuditService } from "../audit.service";
import { QuotesRepository } from "./quotes.repository";
import type { QuoteInput, QuoteRow, QuoteStatus } from "./quote.types";

@Injectable()
export class QuotesService {
  constructor(
    private readonly repo: QuotesRepository,
    private readonly products: ProductsService,
    private readonly audit: AuditService,
  ) {}

  async submit(input: QuoteInput): Promise<QuoteRow> {
    const requested = input.lines ?? [];
    if (requested.length === 0) {
      throw new BadRequestException("There is nothing to quote. Configure something first.");
    }

    // Resolved from the catalogue by SKU, so the stored lines describe real
    // parts. Anything else the caller sent alongside a line is discarded.
    const lines: BuildLine[] = [];
    const unknown: string[] = [];
    const catalog = await this.products.catalogProducts(requested.map((line) => String(line.sku)));
    for (const line of requested) {
      const product = catalog.find((candidate) => candidate.id.toLowerCase() === String(line.sku).toLowerCase());
      if (!product) {
        unknown.push(String(line.sku));
        continue;
      }
      const qty = Math.max(1, Math.min(64, Math.round(Number(line.qty)) || 1));
      lines.push({ product, qty });
    }

    if (lines.length === 0) {
      throw new BadRequestException("None of those parts are in the catalogue.");
    }

    const target = (["desk", "rack", "cluster"] as const).includes(input.target as Target)
      ? (input.target as Target)
      : "desk";

    const report = checkBuild({ lines, target });

    return this.repo.create({
      ...input,
      target,
      lines: lines.map((l) => ({
        sku: l.product.id,
        qty: l.qty,
        brand: l.product.brand,
        model: l.product.model,
        kind: l.product.kind,
        condition: l.product.condition,
      })),
      // The server's own figures, not the browser's.
      summary: { ...report.summary, unknownSkus: unknown } as Record<string, unknown>,
      findings: report.findings as unknown as Array<Record<string, unknown>>,
    });
  }

  list(opts: { status?: string; page?: number; perPage?: number }): Promise<Page<QuoteRow>> {
    return this.repo.list(opts);
  }

  async byReference(reference: string): Promise<QuoteRow> {
    const row = await this.repo.findByReference(reference);
    if (!row) throw new NotFoundException("No such request.");
    return row;
  }

  mine(userId: number): Promise<QuoteRow[]> {
    return this.repo.mine(userId);
  }

  async update(reference: string, patch: { status?: QuoteStatus; internal_note?: string }): Promise<QuoteRow> {
    const row = await this.repo.update(reference, patch);
    if (!row) throw new NotFoundException("No such request.");
    await this.audit.record(null, "quote_updated", "quote", reference, patch as Record<string, unknown>);
    return row;
  }

  counts(): Promise<Record<string, number>> {
    return this.repo.countsByStatus();
  }
}
