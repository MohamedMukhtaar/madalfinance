import type { AppSettings, Invoice, Payment } from "@/types";
import { formatCurrency, formatDate } from "./format";

export interface ExpenseChargeDoc {
  id: string;
  categoryName: string;
  description: string;
  amount: number;
  dueDate: string;
}

type PaymentAllocationRow = {
  invoiceId?: number;
  invoiceNumber?: string;
  amountAllocated: number;
};

const DOC_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 32px;
    background: #f1f5f9;
  }
  .sheet {
    max-width: 760px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    padding: 28px 32px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  }
  .brand { font-size: 20px; font-weight: 800; color: #101848; line-height: 1.2; }
  .sub { color: #64748b; font-size: 12px; margin-top: 6px; line-height: 1.5; }
  .doc-side { text-align: right; min-width: 180px; }
  .doc-type {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #2563eb;
  }
  .doc-no { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 6px; }
  .status {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #eff6ff;
    color: #2563eb;
  }
  .body { padding: 24px 32px 32px; }
  .meta-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }
  .meta-item {
    flex: 1 1 calc(50% - 6px);
    min-width: 220px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .meta-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .meta-value {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
  }
  .party {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }
  .party-card {
    flex: 1 1 280px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #fff;
  }
  .party-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 8px;
  }
  .party-name { font-size: 16px; font-weight: 800; color: #0f172a; }
  .party-line { font-size: 13px; color: #475569; margin-top: 4px; }
  .amount-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    margin-bottom: 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 100%);
    border: 1px solid #bae6fd;
  }
  .amount-hero .label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }
  .amount-hero .value {
    font-size: 30px;
    font-weight: 800;
    color: #059669;
    white-space: nowrap;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 4px;
  }
  th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    border-bottom: 2px solid #e2e8f0;
    padding: 10px 8px;
  }
  td {
    padding: 12px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  .totals {
    margin-top: 20px;
    margin-left: auto;
    width: min(320px, 100%);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 14px;
    color: #475569;
  }
  .totals .grand {
    padding-top: 10px;
    border-top: 2px solid #e2e8f0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .notes {
    margin-top: 18px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    font-size: 13px;
  }
  .footer {
    padding: 16px 32px 24px;
    border-top: 1px solid #e2e8f0;
    color: #94a3b8;
    font-size: 12px;
    text-align: center;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border: none; border-radius: 0; max-width: none; }
  }
`;

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function companyBlock(settings: AppSettings): string {
  const contact = [settings.companyPhone, settings.companyEmail].filter(Boolean).join(" · ");
  return `
    <div>
      <div class="brand">${esc(settings.companyName)}</div>
      ${settings.companyAddress ? `<div class="sub">${esc(settings.companyAddress)}</div>` : ""}
      ${contact ? `<div class="sub">${esc(contact)}</div>` : ""}
    </div>`;
}

function metaItem(label: string, value: string): string {
  return `
    <div class="meta-item">
      <div class="meta-label">${esc(label)}</div>
      <div class="meta-value">${esc(value)}</div>
    </div>`;
}

function openPrintWindow(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>${DOC_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function buildInvoiceHTML(invoice: Invoice, settings: AppSettings): string {
  const { currency } = settings;
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.description)}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.unitPrice, currency)}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(item.total, currency)}</td>
      </tr>`
    )
    .join("");

  return `
  <div class="sheet">
    <div class="head">
      ${companyBlock(settings)}
      <div class="doc-side">
        <div class="doc-type">Invoice</div>
        <div class="doc-no">${esc(invoice.invoiceNumber)}</div>
        <span class="status">${esc(invoice.status.toUpperCase())}</span>
      </div>
    </div>
    <div class="body">
      <div class="meta-grid">
        ${metaItem("Invoice date", formatDate(invoice.invoiceDate))}
        ${metaItem("Due date", formatDate(invoice.dueDate ?? undefined))}
        ${metaItem("Project", invoice.projectName ?? "—")}
        ${metaItem("Balance due", formatCurrency(invoice.balance, currency))}
      </div>
      <div class="party">
        <div class="party-card">
          <div class="party-title">Billed to</div>
          <div class="party-name">${esc(invoice.customerName)}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Unit price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal, currency)}</span></div>
        <div class="row"><span>Tax</span><span>${formatCurrency(invoice.tax, currency)}</span></div>
        <div class="row"><span>Total</span><span>${formatCurrency(invoice.totalAmount, currency)}</span></div>
        <div class="row"><span>Paid</span><span>${formatCurrency(invoice.paidAmount, currency)}</span></div>
        <div class="row grand"><span>Balance due</span><span>${formatCurrency(invoice.balance, currency)}</span></div>
      </div>
    </div>
    <div class="footer">Thank you for your business with ${esc(settings.companyName)}.</div>
  </div>`;
}

export function printInvoice(invoice: Invoice, settings: AppSettings) {
  openPrintWindow(invoice.invoiceNumber, buildInvoiceHTML(invoice, settings));
}

export function buildPaymentHTML(
  payment: Payment,
  settings: AppSettings,
  customer?: { companyName?: string | null; phone?: string | null; address?: string | null; city?: string | null }
): string {
  const { currency } = settings;
  const allocations = (payment.allocations ?? []) as PaymentAllocationRow[];
  const allocRows = allocations
    .map(
      (a) => `
      <tr>
        <td>${esc(a.invoiceNumber ?? (a.invoiceId ? `Invoice #${a.invoiceId}` : "—"))}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(a.amountAllocated, currency)}</td>
      </tr>`
    )
    .join("");

  const customerLines = [customer?.companyName, customer?.address, customer?.city, customer?.phone]
    .filter(Boolean)
    .map((line) => `<div class="party-line">${esc(line)}</div>`)
    .join("");

  return `
  <div class="sheet">
    <div class="head">
      ${companyBlock(settings)}
      <div class="doc-side">
        <div class="doc-type">Payment receipt</div>
        <div class="doc-no">${esc(payment.paymentNumber)}</div>
      </div>
    </div>
    <div class="body">
      <div class="meta-grid">
        ${metaItem("Receipt no", payment.paymentNumber)}
        ${metaItem("Payment date", formatDate(payment.paymentDate))}
        ${metaItem("Method", payment.paymentMethod)}
        ${metaItem("Reference", payment.referenceNumber ?? "—")}
      </div>
      <div class="party">
        <div class="party-card">
          <div class="party-title">Received from</div>
          <div class="party-name">${esc(payment.customerName)}</div>
          ${customerLines}
        </div>
      </div>
      <div class="amount-hero">
        <div>
          <div class="label">Amount received</div>
        </div>
        <div class="value">${formatCurrency(payment.amount, currency)}</div>
      </div>
      ${
        allocRows
          ? `<table>
        <thead><tr><th>Applied to invoice</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${allocRows}</tbody>
      </table>`
          : ""
      }
      ${payment.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(payment.notes)}</div>` : ""}
    </div>
    <div class="footer">Thank you for your payment to ${esc(settings.companyName)}.</div>
  </div>`;
}

export function printPayment(
  payment: Payment,
  settings: AppSettings,
  customer?: { companyName?: string | null; phone?: string | null; address?: string | null; city?: string | null }
) {
  openPrintWindow(payment.paymentNumber, buildPaymentHTML(payment, settings, customer));
}

export function buildChargeHTML(charge: ExpenseChargeDoc, settings: AppSettings): string {
  const { currency } = settings;
  return `
  <div class="sheet">
    <div class="head">
      ${companyBlock(settings)}
      <div class="doc-side">
        <div class="doc-type">Expense charge</div>
        <div class="doc-no">${esc(charge.id)}</div>
      </div>
    </div>
    <div class="body">
      <div class="meta-grid">
        ${metaItem("Category", charge.categoryName)}
        ${metaItem("Due date", formatDate(charge.dueDate))}
      </div>
      <div class="party">
        <div class="party-card">
          <div class="party-title">Description</div>
          <div class="party-name">${esc(charge.description)}</div>
        </div>
      </div>
      <div class="amount-hero">
        <div><div class="label">Amount due</div></div>
        <div class="value" style="color:#dc2626">${formatCurrency(charge.amount, currency)}</div>
      </div>
    </div>
    <div class="footer">Expense charge issued by ${esc(settings.companyName)}.</div>
  </div>`;
}

export function printCharge(charge: ExpenseChargeDoc, settings: AppSettings) {
  openPrintWindow(`Charge ${charge.id}`, buildChargeHTML(charge, settings));
}
