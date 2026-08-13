import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND } from "@/lib/brand";
import type { InvoiceRow, QuoteLine, QuoteRow } from "@/lib/db/types";
import { defaultTemplate } from "@/lib/db/templates";

const ORANGE = rgb(1, 0.353, 0.122);
const INK = rgb(0.07, 0.08, 0.1);
const MUTED = rgb(0.39, 0.42, 0.47);
const LINE = rgb(0.86, 0.87, 0.89);
function colorFromHex(value:unknown){const match=/^#?([0-9a-f]{6})$/i.exec(String(value??""));if(!match)return ORANGE;const n=Number.parseInt(match[1],16);return rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);}

function money(value: number): string {
  return `PKR ${Math.round(Number(value || 0)).toLocaleString("en-US")}`;
}

function totals(subtotal: number, discount: number, taxRate: number) {
  const taxable = Math.max(0, Number(subtotal) - Number(discount));
  const tax = taxable * (Number(taxRate) / 100);
  return { taxable, tax, total: taxable + tax };
}

function safe(value: unknown): string {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "-");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type CommercialDocument = {
  kind: "QUOTATION" | "INVOICE";
  number: string;
  customer: string;
  organisation?: string | null;
  email?: string | null;
  address?: string | null;
  issueDate: string;
  dueLabel: string;
  dueDate?: string | null;
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  taxRate: number;
  paymentTerms?: string | null;
  notes?: string | null;
};

async function render(document: CommercialDocument): Promise<Uint8Array> {
  const template=await defaultTemplate(document.kind==="QUOTATION"?"quote":"invoice");
  const templateConfig=template?.config??{};
  const accent=colorFromHex(templateConfig.accentHex);
  const companyName=String(templateConfig.companyName??BRAND.name);
  const footerText=String(templateConfig.footerText??"");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const pageSize: [number, number] = [595.28, 841.89];
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = 790;
    page.drawRectangle({ x: 0, y: 814, width: pageSize[0], height: 28, color: INK });
    page.drawRectangle({ x: 42, y: 774, width: 10, height: 10, color: accent });
    page.drawText(safe(companyName), { x: 60, y: 773, size: 15, font: bold, color: INK });
    page.drawText(document.kind, { x: 430, y: 773, size: 11, font: bold, color: accent });
    page.drawText(document.number, { x: 430, y: 757, size: 9, font: mono, color: MUTED });
    y = 728;
  };

  const rule = () => page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 0.7, color: LINE });
  const ensure = (height: number) => { if (y - height < 70) addPage(); };
  const labelValue = (label: string, value: string, x: number, top: number) => {
    page.drawText(label.toUpperCase(), { x, y: top, size: 7.5, font: bold, color: accent });
    wrap(value || "-", regular, 9.5, 220).slice(0, 3).forEach((line, i) =>
      page.drawText(line, { x, y: top - 15 - i * 12, size: 9.5, font: regular, color: INK }));
  };

  addPage();
  labelValue("Bill to", document.customer, 42, y);
  labelValue("Organisation", document.organisation || "-", 42, y - 55);
  labelValue("Email", document.email || "-", 42, y - 110);
  labelValue("Issue date", document.issueDate, 330, y);
  labelValue(document.dueLabel, document.dueDate || "-", 330, y - 55);
  labelValue("Currency", "Pakistani Rupee (PKR)", 330, y - 110);
  y -= 170;
  rule();
  y -= 25;

  page.drawText("QTY", { x: 42, y, size: 8, font: bold, color: MUTED });
  page.drawText("DESCRIPTION", { x: 80, y, size: 8, font: bold, color: MUTED });
  page.drawText("UNIT PRICE", { x: 414, y, size: 8, font: bold, color: MUTED });
  page.drawText("AMOUNT", { x: 506, y, size: 8, font: bold, color: MUTED });
  y -= 14;
  rule();
  y -= 18;

  for (const line of document.lines) {
    const description = `${line.brand ?? ""} ${line.model ?? line.sku}`.trim();
    const descriptionLines = wrap(description, regular, 9, 305).slice(0, 2);
    const height = Math.max(35, descriptionLines.length * 12 + 20);
    ensure(height + 20);
    page.drawText(String(line.qty || 1), { x: 45, y, size: 9, font: mono, color: INK });
    descriptionLines.forEach((part, index) => page.drawText(part, { x: 80, y: y - index * 12, size: 9, font: regular, color: INK }));
    page.drawText(safe(line.sku), { x: 80, y: y - descriptionLines.length * 12 - 2, size: 7, font: mono, color: MUTED });
    const unit = Number(line.unit_price_pkr || 0);
    page.drawText(money(unit), { x: 414, y, size: 8.5, font: mono, color: INK });
    page.drawText(money(unit * Number(line.qty || 1)), { x: 506, y, size: 8.5, font: mono, color: INK });
    y -= height;
    rule();
    y -= 12;
  }

  ensure(180);
  const summary = totals(document.subtotal, document.discount, document.taxRate);
  const totalX = 355;
  const amountX = 480;
  const row = (label: string, value: string, strong = false) => {
    page.drawText(label, { x: totalX, y, size: strong ? 10 : 9, font: strong ? bold : regular, color: strong ? INK : MUTED });
    page.drawText(value, { x: amountX, y, size: strong ? 10 : 9, font: strong ? bold : mono, color: strong ? accent : INK });
    y -= strong ? 25 : 20;
  };
  row("Subtotal", money(document.subtotal));
  if (document.discount > 0) row("Discount", `-${money(document.discount)}`);
  row(`Tax (${Number(document.taxRate)}%)`, money(summary.tax));
  page.drawLine({ start: { x: totalX, y: y + 8 }, end: { x: 553, y: y + 8 }, thickness: 1, color: INK });
  row("TOTAL", money(summary.total), true);

  y -= 12;
  if (document.paymentTerms) {
    page.drawText("PAYMENT TERMS", { x: 42, y, size: 7.5, font: bold, color: accent });
    y -= 15;
    for (const line of wrap(document.paymentTerms, regular, 8.5, 290).slice(0, 4)) {
      page.drawText(line, { x: 42, y, size: 8.5, font: regular, color: MUTED }); y -= 11;
    }
  }
  if (document.notes) {
    y -= 12;
    page.drawText("NOTES", { x: 42, y, size: 7.5, font: bold, color: accent });
    y -= 15;
    for (const line of wrap(document.notes, regular, 8.5, 290).slice(0, 5)) {
      page.drawText(line, { x: 42, y, size: 8.5, font: regular, color: MUTED }); y -= 11;
    }
  }

  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: 42, y: 48 }, end: { x: 553, y: 48 }, thickness: 0.6, color: LINE });
    p.drawText(safe(footerText||`${BRAND.legal} | ${BRAND.email} | ${BRAND.phone}`), { x: 42, y: 31, size: 7.5, font: regular, color: MUTED });
    p.drawText(`${index + 1} / ${pages.length}`, { x: 520, y: 31, size: 7.5, font: mono, color: MUTED });
  });
  return pdf.save();
}

export function quotePdf(quote: QuoteRow): Promise<Uint8Array> {
  return render({
    kind: "QUOTATION", number: quote.reference, customer: quote.contact_name,
    organisation: quote.organisation, email: quote.contact_email,
    address: quote.city, issueDate: new Date(quote.updated_at || quote.created_at).toLocaleDateString("en-GB"),
    dueLabel: "Valid until", dueDate: quote.valid_until, lines: quote.lines,
    subtotal: Number(quote.subtotal_pkr), discount: Number(quote.discount_pkr), taxRate: Number(quote.tax_rate),
    paymentTerms: quote.payment_terms, notes: [quote.customer_ntn?`NTN: ${quote.customer_ntn}`:"",quote.customer_strn?`STRN: ${quote.customer_strn}`:"",quote.notes??""].filter(Boolean).join(" | "),
  });
}

export function invoicePdf(invoice: InvoiceRow): Promise<Uint8Array> {
  return render({
    kind: "INVOICE", number: invoice.invoice_number, customer: invoice.customer_name,
    organisation: invoice.organisation, email: invoice.customer_email, address: invoice.billing_address,
    issueDate: new Date(invoice.issue_date).toLocaleDateString("en-GB"), dueLabel: "Due date", dueDate: invoice.due_date,
    lines: invoice.lines, subtotal: Number(invoice.subtotal_pkr), discount: Number(invoice.discount_pkr),
    taxRate: Number(invoice.tax_rate), paymentTerms: invoice.payment_terms, notes: [invoice.customer_ntn?`NTN: ${invoice.customer_ntn}`:"",invoice.customer_strn?`STRN: ${invoice.customer_strn}`:"",invoice.notes??""].filter(Boolean).join(" | "),
  });
}
