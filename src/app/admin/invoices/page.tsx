import Link from "next/link";
import { invoiceTotal, listInvoices } from "@/lib/db/invoices";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/db/types";

export const metadata = { title: "Invoices" };
const STATUSES = Object.entries(INVOICE_STATUS_LABEL) as [InvoiceStatus, string][];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await listInvoices({ status: sp.status, page, perPage: 25 });

  return (
    <div className="shell admin-screen py-6 sm:py-8">
      <div className="admin-heading">
        <div><p className="admin-kicker">Commercial documents</p><h1>Invoices</h1></div>
        <span className="admin-count">{String(data.total).padStart(3, "0")}</span>
      </div>
      <div className="flex gap-1.5 mb-5 overflow-x-auto no-bar">
        <Link href="/admin/invoices" className={`pill shrink-0 ${!sp.status ? "pill-cool" : ""}`}>All</Link>
        {STATUSES.map(([status, label]) => <Link key={status} href={`/admin/invoices?status=${status}`} className={`pill shrink-0 ${sp.status === status ? "pill-cool" : ""}`}>{label}</Link>)}
      </div>
      <div className="admin-table">
        <div className="admin-table-head"><span>Invoice</span><span>Customer</span><span>Status</span><span>Total</span></div>
        {data.items.map((invoice) => (
          <Link key={invoice.id} href={`/admin/invoices/${invoice.invoice_number}`} className="admin-table-row">
            <span><strong className="t-data">{invoice.invoice_number}</strong><small>{new Date(invoice.issue_date).toLocaleDateString("en-GB")}</small></span>
            <span><strong>{invoice.customer_name}</strong><small>{invoice.organisation || invoice.customer_email}</small></span>
            <span><i className={`admin-status admin-status-${invoice.status}`}>{INVOICE_STATUS_LABEL[invoice.status]}</i></span>
            <span className="t-data text-right">PKR {Math.round(invoiceTotal(invoice)).toLocaleString("en-US")}</span>
          </Link>
        ))}
        {!data.items.length && <p className="p-8 text-center text-ink-2">No invoices yet. Create one from a priced quote.</p>}
      </div>
    </div>
  );
}
