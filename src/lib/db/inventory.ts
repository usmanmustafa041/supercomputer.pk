import "server-only";

import { pool, query } from "./client";
import { ensureReady } from "./init";
import type { QuoteLine } from "./types";

export const MOVEMENT_TYPES = ["purchase_import", "received", "reserved_quote", "reservation_released", "sold", "returned", "damaged", "warranty_replacement", "manual_adjustment"] as const;
export type MovementType = typeof MOVEMENT_TYPES[number];

export interface InventoryBalance {
  product_id: number;
  sku: string;
  brand: string;
  model: string;
  on_hand: number;
  reserved: number;
  available: number;
}

export async function inventoryBalances(search = ""): Promise<InventoryBalance[]> {
  await ensureReady();
  return query<InventoryBalance>(`SELECT b.*, p.brand, p.model FROM inventory_balances b JOIN products p ON p.id=b.product_id
    WHERE $1='' OR lower(p.sku||' '||p.brand||' '||p.model) LIKE '%'||lower($1)||'%'
    ORDER BY p.updated_at DESC LIMIT 250`, [search]);
}

export async function inventoryHistory(sku?: string) {
  await ensureReady();
  return query<{ id:number; sku:string; movement_type:MovementType; quantity_delta:number; reserved_delta:number; reference:string|null; note:string|null; occurred_at:Date; actor_email:string|null }>(`SELECT m.id,p.sku,m.movement_type,m.quantity_delta,m.reserved_delta,m.reference,m.note,m.occurred_at,u.email actor_email
    FROM inventory_movements m JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.actor_id
    WHERE $1='' OR lower(p.sku)=lower($1) ORDER BY m.occurred_at DESC,m.id DESC LIMIT 500`, [sku ?? ""]);
}

export async function recordMovement(input: { sku:string; type:MovementType; quantityDelta:number; reservedDelta?:number; reference?:string; note?:string; actorId:number }): Promise<void> {
  await ensureReady();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const product = await client.query<{id:number}>("SELECT id FROM products WHERE lower(sku)=lower($1) FOR UPDATE", [input.sku]);
    if (!product.rows[0]) throw new Error("Product not found.");
    await client.query(`INSERT INTO inventory_movements(product_id,movement_type,quantity_delta,reserved_delta,reference,note,actor_id)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [product.rows[0].id,input.type,input.quantityDelta,input.reservedDelta ?? 0,input.reference ?? null,input.note ?? null,input.actorId]);
    const balance = await client.query<{available:number;on_hand:number;reserved:number}>("SELECT available,on_hand,reserved FROM inventory_balances WHERE product_id=$1", [product.rows[0].id]);
    if (Number(balance.rows[0].on_hand) < 0 || Number(balance.rows[0].reserved) < 0 || Number(balance.rows[0].available) < 0) throw new Error("Movement would make inventory negative.");
    await client.query("UPDATE products SET stock_qty=$1,updated_at=now() WHERE id=$2", [balance.rows[0].available, product.rows[0].id]);
    await client.query("COMMIT");
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function setOnHandStock(sku:string,desired:number,actorId:number):Promise<void>{
  await ensureReady();const balance=await query<{on_hand:number}>("SELECT on_hand FROM inventory_balances WHERE lower(sku)=lower($1)",[sku]);if(!balance[0])throw new Error("Product not found.");const delta=Math.max(0,desired)-Number(balance[0].on_hand);if(delta)await recordMovement({sku,type:"manual_adjustment",quantityDelta:delta,reference:"QUICK-STOCK",note:`Set on-hand stock to ${Math.max(0,desired)}`,actorId});
}

/** Locks every involved SKU in one transaction, preventing double reservation. */
export async function reserveQuoteStock(quoteId:number, lines:QuoteLine[], actorId:number): Promise<void> {
  await ensureReady();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const line of [...lines].sort((a,b)=>a.sku.localeCompare(b.sku))) {
      const product = await client.query<{id:number}>("SELECT id FROM products WHERE lower(sku)=lower($1) FOR UPDATE", [line.sku]);
      if (!product.rows[0]) throw new Error(`SKU ${line.sku} is unavailable.`);
      const existing = await client.query<{qty:string}>("SELECT COALESCE(sum(reserved_delta),0) qty FROM inventory_movements WHERE product_id=$1 AND quote_id=$2", [product.rows[0].id,quoteId]);
      const needed = Math.max(0, Number(line.qty) - Number(existing.rows[0].qty));
      if (!needed) continue;
      const balance = await client.query<{available:number}>("SELECT available FROM inventory_balances WHERE product_id=$1", [product.rows[0].id]);
      if (Number(balance.rows[0].available) < needed) throw new Error(`${line.sku} has only ${balance.rows[0].available} available; ${needed} more required.`);
      await client.query(`INSERT INTO inventory_movements(product_id,movement_type,reserved_delta,quote_id,reference,note,actor_id)
        VALUES($1,'reserved_quote',$2,$3,$4,'Reserved on accepted quote',$5)`, [product.rows[0].id,needed,quoteId,`QUOTE-${quoteId}`,actorId]);
      await client.query("UPDATE products SET stock_qty=stock_qty-$1,updated_at=now() WHERE id=$2", [needed,product.rows[0].id]);
    }
    await client.query("COMMIT");
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function releaseQuoteStock(quoteId:number,actorId:number):Promise<void>{await ensureReady();const client=await pool.connect();try{await client.query("BEGIN");const reservations=await client.query<{product_id:number;qty:string}>(`SELECT product_id,COALESCE(sum(reserved_delta),0) qty FROM inventory_movements WHERE quote_id=$1 GROUP BY product_id HAVING sum(reserved_delta)>0`,[quoteId]);for(const row of reservations.rows){await client.query("SELECT id FROM products WHERE id=$1 FOR UPDATE",[row.product_id]);const qty=Number(row.qty);await client.query(`INSERT INTO inventory_movements(product_id,movement_type,reserved_delta,quote_id,reference,note,actor_id) VALUES($1,'reservation_released',$2,$3,$4,'Quote closed; reservation released',$5)`,[row.product_id,-qty,quoteId,`QUOTE-${quoteId}`,actorId]);await client.query("UPDATE products SET stock_qty=stock_qty+$1,updated_at=now() WHERE id=$2",[qty,row.product_id]);}await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}

export async function fulfilInvoiceStock(invoiceId:number,actorId:number):Promise<void>{await ensureReady();const client=await pool.connect();try{await client.query("BEGIN");const invoice=await client.query<{quote_id:number|null;invoice_number:string}>("SELECT quote_id,invoice_number FROM invoices WHERE id=$1 FOR UPDATE",[invoiceId]);if(!invoice.rows[0]?.quote_id)throw new Error("Invoice is not linked to a reserved quote.");const reservations=await client.query<{product_id:number;qty:string}>(`SELECT product_id,COALESCE(sum(reserved_delta),0) qty FROM inventory_movements WHERE quote_id=$1 GROUP BY product_id HAVING sum(reserved_delta)>0`,[invoice.rows[0].quote_id]);for(const row of reservations.rows){await client.query("SELECT id FROM products WHERE id=$1 FOR UPDATE",[row.product_id]);const already=await client.query<{qty:string}>("SELECT COALESCE(-sum(quantity_delta),0) qty FROM inventory_movements WHERE invoice_id=$1 AND product_id=$2 AND movement_type='sold'",[invoiceId,row.product_id]);const qty=Number(row.qty)-Number(already.rows[0].qty);if(qty<=0)continue;await client.query(`INSERT INTO inventory_movements(product_id,movement_type,quantity_delta,reserved_delta,quote_id,invoice_id,reference,note,actor_id) VALUES($1,'sold',$2,$2,$3,$4,$5,'Delivered against invoice',$6)`,[row.product_id,-qty,invoice.rows[0].quote_id,invoiceId,invoice.rows[0].invoice_number,actorId]);}await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
