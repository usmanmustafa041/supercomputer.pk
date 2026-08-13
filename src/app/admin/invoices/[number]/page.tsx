import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice, invoiceTotal } from "@/lib/db/invoices";
import { paymentsForInvoice } from "@/lib/db/payments";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/db/types";
import { addPayment, emailInvoice, removeInvoice, saveInvoice } from "../../actions";

export const metadata = { title: "Invoice" };
const STATUSES = Object.entries(INVOICE_STATUS_LABEL) as [InvoiceStatus, string][];

export default async function InvoiceDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const invoice = await getInvoice(decodeURIComponent(number));
  if (!invoice) notFound();
  const total = invoiceTotal(invoice);
  const payments = await paymentsForInvoice(invoice.id);
  const paid = payments.reduce((sum,p)=>sum+Number(p.amount_pkr),0);

  return (
    <div className="shell admin-screen py-6 sm:py-8 max-w-6xl">
      <Link href="/admin/invoices" className="admin-back">← All invoices</Link>
      <div className="admin-heading mt-4">
        <div><p className="admin-kicker">Invoice record</p><h1>{invoice.invoice_number}</h1></div>
        <div className="flex gap-2"><a href={`/api/admin/invoices/${invoice.invoice_number}/pdf`} className="btn btn-primary">Download PDF</a><form action={emailInvoice}><input type="hidden" name="invoice_number" value={invoice.invoice_number}/><button className="btn">Email PDF</button></form>{invoice.customer_email&&<a target="_blank" rel="noreferrer" className="btn" href={`https://wa.me/?text=${encodeURIComponent(`Invoice ${invoice.invoice_number}: ${process.env.APP_URL??"http://localhost:3000"}/api/admin/invoices/${invoice.invoice_number}/pdf`)}`}>WhatsApp</a>}</div>
      </div>
      <p className="text-[12px] text-ink-2 mb-4">Sent: {invoice.sent_at?new Date(invoice.sent_at).toLocaleString("en-GB"):"not sent"} · Opened: {invoice.opened_at?new Date(invoice.opened_at).toLocaleString("en-GB"):"not recorded"}</p>
      <form action={saveInvoice} className="grid lg:grid-cols-[1fr_19rem] gap-5 items-start">
        <input type="hidden" name="invoice_number" value={invoice.invoice_number} />
        <div className="grid gap-5">
          <section className="admin-panel grid sm:grid-cols-2 gap-4">
            <label><span>Customer</span><input name="customer_name" required defaultValue={invoice.customer_name} className="field" /></label>
            <label><span>Email</span><input name="customer_email" type="email" defaultValue={invoice.customer_email ?? ""} className="field" /></label>
            <label><span>Organisation</span><input name="organisation" defaultValue={invoice.organisation ?? ""} className="field" /></label>
            <label><span>Billing address</span><input name="billing_address" defaultValue={invoice.billing_address ?? ""} className="field" /></label>
            <label><span>Shipping address</span><input name="shipping_address" defaultValue={invoice.shipping_address ?? ""} className="field" /></label>
            <label><span>Customer NTN</span><input name="customer_ntn" defaultValue={invoice.customer_ntn ?? ""} className="field" /></label>
            <label><span>Customer STRN</span><input name="customer_strn" defaultValue={invoice.customer_strn ?? ""} className="field" /></label>
          </section>
          <section className="admin-panel"><div className="flex justify-between"><h2>Payments</h2><strong className="text-acc">PKR {paid.toLocaleString()} / {Math.round(total).toLocaleString()}</strong></div>{payments.map(p=><div key={p.id} className="py-2 border-b border-[var(--line)] text-[12px]">{p.payment_reference} · PKR {Number(p.amount_pkr).toLocaleString()} · {p.payment_method} · {new Date(p.received_at).toLocaleDateString("en-GB")}</div>)}<form action={addPayment} className="grid sm:grid-cols-2 gap-3 mt-4"><input type="hidden" name="invoice_id" value={invoice.id}/><input type="hidden" name="invoice_number" value={invoice.invoice_number}/><label><span>Amount PKR</span><input required name="amount_pkr" type="number" min="1" max={Math.max(0,total-paid)} className="field"/></label><label><span>Method</span><select name="payment_method" className="field"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option></select></label><label><span>Transaction reference</span><input name="transaction_reference" className="field"/></label><label><span>Note</span><input name="payment_note" className="field"/></label><button className="btn btn-primary">Record payment</button></form></section>
          <section className="admin-panel">
            <h2>Line items</h2>
            <div className="grid gap-2 mt-4">
              {invoice.lines.map((line, index) => (
                <div key={`${line.sku}-${index}`} className="admin-line-item">
                  <span><strong>{line.brand} {line.model}</strong><small>{line.sku} · Qty {line.qty}</small></span>
                  <label><span>Unit price PKR</span><input name={`line_price_${index}`} type="number" min="0" step="1" defaultValue={Number(line.unit_price_pkr || 0)} className="field text-right" /></label>
                </div>
              ))}
            </div>
          </section>
          <section className="admin-panel grid sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2"><span>Payment terms</span><input name="payment_terms" defaultValue={invoice.payment_terms ?? ""} className="field" /></label>
            <label className="sm:col-span-2"><span>Notes</span><textarea name="notes" rows={4} defaultValue={invoice.notes ?? ""} className="field h-auto py-2" /></label>
          </section>
        </div>
        <aside className="admin-panel lg:sticky lg:top-20 grid gap-4">
          <h2>Invoice controls</h2>
          <label><span>Status</span><select name="status" defaultValue={invoice.status} className="field">{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Issue date</span><input name="issue_date" type="date" defaultValue={String(invoice.issue_date).slice(0, 10)} className="field" /></label>
          <label><span>Due date</span><input name="due_date" type="date" defaultValue={invoice.due_date ? String(invoice.due_date).slice(0, 10) : ""} className="field" /></label>
          <label><span>Tax rate %</span><input name="tax_rate" type="number" min="0" step="0.01" defaultValue={Number(invoice.tax_rate)} className="field" /></label>
          <label><span>Discount PKR</span><input name="discount_pkr" type="number" min="0" step="1" defaultValue={Number(invoice.discount_pkr)} className="field" /></label>
          <label><span>Cancellation note</span><textarea name="cancellation_note" rows={3} defaultValue={invoice.cancellation_note??""} className="field h-auto" /></label>
          <div className="admin-total"><span>Current total</span><strong>PKR {Math.round(total).toLocaleString("en-US")}</strong></div>
          <button className="btn btn-primary">Save invoice</button>
        </aside>
      </form>
      <form action={removeInvoice} className="admin-danger mt-6">
        <input type="hidden" name="invoice_number" value={invoice.invoice_number} />
        <label className="flex-1"><span>Cancellation reason</span><input name="cancellation_note" required defaultValue={invoice.cancellation_note??""} className="field mt-1" /></label>
        <button className="btn">Cancel invoice</button>
      </form>
    </div>
  );
}
