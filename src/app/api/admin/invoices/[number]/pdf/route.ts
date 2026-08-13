import { requireAdmin } from "@/lib/auth/session";
import { getInvoice } from "@/lib/db/invoices";
import { invoicePdf } from "@/lib/pdf/commercial";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  await requireAdmin();
  const { number } = await params;
  const invoice = await getInvoice(decodeURIComponent(number));
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  const bytes = await invoicePdf(invoice);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
