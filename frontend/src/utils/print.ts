import type { AppSettings, Invoice } from "@/types";
import { formatCurrency, formatDate } from "./format";

export function buildInvoiceHTML(invoice: Invoice, settings: AppSettings): string {
  const { currency } = settings;
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice, currency)}</td>
        <td>${formatCurrency(item.total, currency)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; color: #0f172a; padding: 48px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 22px; font-weight: 800; }
  .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
  .inv-no { text-align: right; font-size: 28px; font-weight: 800; color: #2563eb; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
  .meta h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin: 0 0 8px; }
  .meta p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; margin-top: 40px; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; border-bottom: 2px solid #e2e8f0; padding: 10px 8px; }
  td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; }
  .totals { margin-top: 24px; margin-left: auto; width: 280px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals .grand { font-weight: 800; font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 10px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .footer { margin-top: 64px; color: #94a3b8; font-size: 12px; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">${settings.companyName}</div>
      <div class="sub">${settings.companyAddress ?? ""}</div>
      <div class="sub">${settings.companyPhone ?? ""} · ${settings.companyEmail ?? ""}</div>
    </div>
    <div>
      <div class="inv-no">${invoice.invoiceNumber}</div>
      <div style="text-align:right; margin-top:8px;"><span class="status" style="background:#eff6ff;color:#2563eb;">${invoice.status.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="meta">
    <div>
      <h4>Billed To</h4>
      <p style="font-weight:700;">${invoice.customerName}</p>
    </div>
    <div>
      <h4>Invoice Details</h4>
      <p>Issued: ${formatDate(invoice.invoiceDate)}</p>
      <p>Due: ${formatDate(invoice.dueDate ?? undefined)}</p>
      <p>Project: ${invoice.projectName ?? "—"}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${formatCurrency(invoice.subtotal, currency)}</span></div>
    <div><span>Tax</span><span>${formatCurrency(invoice.tax, currency)}</span></div>
    <div><span>Total</span><span>${formatCurrency(invoice.totalAmount, currency)}</span></div>
    <div><span>Paid</span><span>${formatCurrency(invoice.paidAmount, currency)}</span></div>
    <div class="grand"><span>Balance Due</span><span>${formatCurrency(invoice.balance, currency)}</span></div>
  </div>

  <div class="footer">Thank you for your business with ${settings.companyName}.</div>
</body>
</html>`;
}

export function printInvoice(invoice: Invoice, settings: AppSettings) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(buildInvoiceHTML(invoice, settings));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}
