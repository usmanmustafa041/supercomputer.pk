import { requireAdmin } from "@/lib/auth/session";
import { getQuote } from "@/lib/db/quotes";
import { quotePdf } from "@/lib/pdf/commercial";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  await requireAdmin();
  const { reference } = await params;
  const quote = await getQuote(decodeURIComponent(reference));
  if (!quote) return new Response("Quote not found", { status: 404 });
  const bytes = await quotePdf(quote);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
