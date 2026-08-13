/**
 * The numbers on the admin overview.
 *
 * Its own endpoint rather than the caller assembling six counts, because that
 * would be six round trips to render one screen. One query, six subqueries, one
 * trip.
 *
 * It spans products, quotes and users, so it does not belong to any of their
 * modules. A small module of its own beats picking one of them arbitrarily and
 * having the next person wonder why the user count lives under quotes.
 */

import { Controller, Get } from "@nestjs/common";
import { Roles } from "../common/decorators";
import { DatabaseService } from "../database/database.service";

export interface AdminStats {
  productsTotal: number;
  productsActive: number;
  productsInStock: number;
  quotesTotal: number;
  quotesNew: number;
  usersTotal: number;
}

@Controller("stats")
export class StatsController {
  constructor(private readonly db: DatabaseService) {}

  @Roles("admin")
  @Get()
  async overview(): Promise<AdminStats> {
    const row = await this.db.one<Record<string, string>>(`
      SELECT
        (SELECT count(*) FROM products)                     AS products_total,
        (SELECT count(*) FROM products WHERE is_active)     AS products_active,
        (SELECT count(*) FROM products WHERE stock_qty > 0) AS products_in_stock,
        (SELECT count(*) FROM quotes)                       AS quotes_total,
        (SELECT count(*) FROM quotes WHERE status = 'new')  AS quotes_new,
        (SELECT count(*) FROM users)                        AS users_total
    `);

    // Defaulted rather than trusted. A page that renders a zero is better than
    // one that throws on undefined.toLocaleString, which is exactly what this
    // endpoint was added to fix.
    return {
      productsTotal: Number(row?.products_total ?? 0),
      productsActive: Number(row?.products_active ?? 0),
      productsInStock: Number(row?.products_in_stock ?? 0),
      quotesTotal: Number(row?.quotes_total ?? 0),
      quotesNew: Number(row?.quotes_new ?? 0),
      usersTotal: Number(row?.users_total ?? 0),
    };
  }
}
