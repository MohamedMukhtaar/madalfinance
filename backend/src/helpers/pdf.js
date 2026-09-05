import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import env from '../config/index.js';
import { REFERENCE_TYPES } from '../utils/constants.js';

const ensureReportsDir = () => {
  if (!fs.existsSync(env.dirs.reports)) fs.mkdirSync(env.dirs.reports, { recursive: true });
};

const money = (settings, value) =>
  `${settings?.currency || '$'}${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const addCompanyHeader = (doc, settings) => {
  const left = 48;
  const right = 300;
  doc
    .fillColor('#101848')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(settings?.company_name || 'ICT Solutions', left, 48, { width: right - left, align: 'left' });
  const contact = [settings?.company_address, settings?.company_phone, settings?.company_email]
    .filter(Boolean)
    .join(' · ');
  if (contact) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(contact, left, doc.y + 4, { width: right - left });
  }
  doc.moveDown(1.2);
};

const addDocTitle = (doc, title, number) => {
  const x = 360;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#2563eb').text(title.toUpperCase(), x, 48, { width: 197, align: 'right' });
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text(number, x, 64, { width: 197, align: 'right' });
  doc.moveDown(1.5);
};

const addMetaGrid = (doc, rows) => {
  const startY = doc.y + 8;
  const colWidth = 250;
  const rowHeight = 42;
  rows.forEach((row, index) => {
    const col = index % 2;
    const line = Math.floor(index / 2);
    const x = 48 + col * colWidth;
    const y = startY + line * rowHeight;
    doc.roundedRect(x, y, colWidth - 12, 34, 6).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text(row.label.toUpperCase(), x + 10, y + 8, { width: colWidth - 32 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(row.value, x + 10, y + 20, { width: colWidth - 32 });
  });
  const lines = Math.ceil(rows.length / 2);
  doc.y = startY + lines * rowHeight + 8;
};

const addPartyCard = (doc, title, name, lines = []) => {
  const y = doc.y + 6;
  doc.roundedRect(48, y, 509, 58 + lines.length * 12, 8).stroke('#e2e8f0');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text(title.toUpperCase(), 58, y + 10);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(name || '—', 58, y + 24, { width: 480 });
  let lineY = y + 42;
  lines.filter(Boolean).forEach((line) => {
    doc.fontSize(9).font('Helvetica').fillColor('#475569').text(line, 58, lineY, { width: 480 });
    lineY += 12;
  });
  doc.y = lineY + 10;
};

const addAmountHero = (doc, label, value, color = '#059669', bg = { fill: '#ecfdf5', stroke: '#bae6fd' }) => {
  const y = doc.y + 4;
  doc.roundedRect(48, y, 509, 54, 10).fillAndStroke(bg.fill, bg.stroke);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(label.toUpperCase(), 58, y + 12);
  doc.fontSize(24).font('Helvetica-Bold').fillColor(color).text(value, 360, y + 10, { width: 187, align: 'right' });
  doc.y = y + 64;
};

/**
 * Builds a PDF invoice. Returns the path of the generated file.
 */
export const generateInvoicePdf = async ({ invoice, items, customer, settings }) => {
  ensureReportsDir();
  const filename = `${invoice.invoice_number}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Invoice', invoice.invoice_number);
    addMetaGrid(doc, [
      { label: 'Invoice date', value: dayjs(invoice.invoice_date).format('DD MMM YYYY') },
      { label: 'Due date', value: invoice.due_date ? dayjs(invoice.due_date).format('DD MMM YYYY') : '—' },
      { label: 'Status', value: invoice.status },
      { label: 'Balance due', value: money(settings, invoice.balance ?? invoice.total_amount - invoice.paid_amount) },
    ]);

    addPartyCard(doc, 'Billed to', customer?.customer_name || '', [
      customer?.company_name,
      customer?.address,
      customer?.city,
      customer?.phone,
    ]);

    const tableTop = doc.y + 6;
    const colX = { desc: 58, qty: 360, price: 420, total: 490 };
    const drawRow = (y, values, bold, shade) => {
      if (shade) doc.rect(48, y, 509, 20).fill('#f8fafc');
      doc.fillColor('#0f172a').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.text(values.desc, colX.desc, y + 5, { width: 290 });
      doc.text(values.qty, colX.qty, y + 5, { width: 50, align: 'right' });
      doc.text(values.price, colX.price, y + 5, { width: 60, align: 'right' });
      doc.text(values.total, colX.total, y + 5, { width: 57, align: 'right' });
    };

    drawRow(tableTop, { desc: 'Description', qty: 'Qty', price: 'Unit Price', total: 'Total' }, true, true);
    let y = tableTop + 24;
    (items || []).forEach((item, i) => {
      drawRow(y, {
        desc: item.description,
        qty: String(item.quantity),
        price: money(settings, item.unit_price),
        total: money(settings, item.total),
      }, false, i % 2 === 1);
      y += 22;
    });
    doc.y = y + 10;

    const totalsX = 360;
    const totalRow = (label, value, bold) => {
      doc.fillColor('#64748b').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(label, totalsX, doc.y, { width: 90, continued: true });
      doc.fillColor('#0f172a').font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, { width: 97, align: 'right' });
      doc.moveDown(0.4);
    };
    totalRow('Subtotal', money(settings, invoice.subtotal), false);
    if (Number(invoice.discount || 0) > 0) totalRow('Discount', `-${money(settings, invoice.discount)}`, false);
    if (Number(invoice.tax || 0) > 0) totalRow('Tax', money(settings, invoice.tax), false);
    totalRow('Total', money(settings, invoice.total_amount), true);
    totalRow('Paid', money(settings, invoice.paid_amount), false);
    totalRow('Balance Due', money(settings, invoice.balance ?? invoice.total_amount - invoice.paid_amount), true);

    doc.moveDown(2);
    if (invoice.notes) {
      doc.fontSize(9).fillColor('#64748b').text(`Notes: ${invoice.notes}`);
      doc.moveDown(1);
    }
    doc.moveTo(48, doc.y).lineTo(557, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by Madal ICT Solutions · ${dayjs().format('DD MMM YYYY HH:mm')}`,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

/**
 * Builds a PDF payment receipt. Returns the path of the generated file.
 */
export const generatePaymentPdf = async ({ payment, customer, allocations, settings }) => {
  ensureReportsDir();
  const filename = `${payment.payment_number}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Payment receipt', payment.payment_number);
    addMetaGrid(doc, [
      { label: 'Receipt no', value: payment.payment_number },
      { label: 'Payment date', value: dayjs(payment.payment_date).format('DD MMM YYYY') },
      { label: 'Method', value: payment.payment_method || '—' },
      { label: 'Reference', value: payment.reference_number || '—' },
    ]);

    addPartyCard(doc, 'Received from', customer?.customer_name || payment.customer_name || '', [
      customer?.company_name,
      customer?.address,
      customer?.city,
      customer?.phone,
    ]);

    addAmountHero(doc, 'Amount received', money(settings, payment.amount));

    if (allocations?.length) {
      const tableTop = doc.y + 4;
      const colX = { inv: 58, amt: 470 };
      doc.rect(48, tableTop, 509, 20).fill('#f8fafc');
      doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8);
      doc.text('APPLIED TO INVOICE', colX.inv, tableTop + 6, { width: 320 });
      doc.text('AMOUNT', colX.amt, tableTop + 6, { width: 77, align: 'right' });
      let y = tableTop + 24;
      allocations.forEach((a, i) => {
        if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
        doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
        doc.text(a.invoice_number || `Invoice #${a.invoice_id}`, colX.inv, y + 5, { width: 390 });
        doc.font('Helvetica-Bold').text(money(settings, a.amount_allocated), colX.amt, y + 5, { width: 77, align: 'right' });
        y += 22;
      });
      doc.y = y + 8;
    }

    if (payment.notes) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#64748b').text(`Notes: ${payment.notes}`);
    }

    doc.moveDown(2);
    doc.moveTo(48, doc.y).lineTo(557, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by Madal ICT Solutions · ${dayjs().format('DD MMM YYYY HH:mm')}`,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

/**
 * Generic PDF report generator (tabulated data with a title).
 */
export const generateIncomeStatementPdf = async ({ data, fromDate, toDate, settings }) => {
  ensureReportsDir();
  const filename = `income-statement-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  const totalIncome = Number(data?.total_income ?? 0);
  const totalExpense = Number(data?.total_expense ?? 0);
  const netProfit = Number(data?.net_profit ?? totalIncome - totalExpense);
  const marginPct = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';
  const isProfit = netProfit >= 0;
  const periodLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format('DD MMM YYYY')} – ${dayjs(toDate).format('DD MMM YYYY')}`
      : 'All time';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Income statement', periodLabel);

    addMetaGrid(doc, [
      { label: 'Period from', value: fromDate ? dayjs(fromDate).format('DD MMM YYYY') : '—' },
      { label: 'Period to', value: toDate ? dayjs(toDate).format('DD MMM YYYY') : '—' },
      { label: 'Generated', value: dayjs().format('DD MMM YYYY HH:mm') },
      { label: 'Profit margin', value: `${marginPct}%` },
    ]);

    // Summary stat cards
    const cardY = doc.y + 10;
    const cardW = 163;
    const cardH = 62;
    const cards = [
      { label: 'Total income', value: money(settings, totalIncome), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Total expenses', value: money(settings, totalExpense), fill: '#fffbeb', stroke: '#fde68a', color: '#d97706' },
      {
        label: isProfit ? 'Net profit' : 'Net loss',
        value: money(settings, Math.abs(netProfit)),
        fill: isProfit ? '#eff6ff' : '#fff1f2',
        stroke: isProfit ? '#bfdbfe' : '#fecdd3',
        color: isProfit ? '#101848' : '#e11d48',
      },
    ];
    cards.forEach((card, i) => {
      const x = 48 + i * (cardW + 10);
      doc.roundedRect(x, cardY, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, cardY + 12, { width: cardW - 24 });
      doc.fontSize(16).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, cardY + 30, { width: cardW - 24 });
    });
    doc.y = cardY + cardH + 20;

    // Statement table
    const sectionTitle = (label) => {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text(label.toUpperCase(), 48, doc.y);
      doc.moveDown(0.6);
    };

    const statementRow = (label, value, { bold = false, color = '#0f172a', divider = false } = {}) => {
      const y = doc.y;
      if (divider) doc.moveTo(48, y).lineTo(557, y).strokeColor('#e2e8f0').stroke();
      const rowY = divider ? y + 8 : y;
      doc.fontSize(bold ? 11 : 10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor('#475569')
        .text(label, 58, rowY, { width: 360 });
      doc.fontSize(bold ? 12 : 10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(color)
        .text(value, 400, rowY, { width: 147, align: 'right' });
      doc.y = rowY + (bold ? 22 : 18);
    };

    doc.roundedRect(48, doc.y, 509, 4, 2).fill('#101848');
    doc.y += 14;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Statement of operations', 48, doc.y);
    doc.moveDown(1);

    sectionTitle('Revenue');
    statementRow('Total income', money(settings, totalIncome), { color: '#059669' });

    sectionTitle('Expenses');
    statementRow('Total expenses', money(settings, totalExpense), { color: '#d97706' });

    doc.moveDown(0.4);
    statementRow('Net profit / (loss)', money(settings, netProfit), {
      bold: true,
      color: isProfit ? '#059669' : '#e11d48',
      divider: true,
    });

    // Result highlight
    addAmountHero(
      doc,
      isProfit ? 'Net profit for the period' : 'Net loss for the period',
      money(settings, Math.abs(netProfit)),
      isProfit ? '#059669' : '#e11d48',
      isProfit ? { fill: '#ecfdf5', stroke: '#bbf7d0' } : { fill: '#fff1f2', stroke: '#fecdd3' }
    );

    doc.moveDown(1);
    doc.roundedRect(48, doc.y, 509, 44, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text('SUMMARY', 58, doc.y + 10);
    doc.fontSize(9).font('Helvetica').fillColor('#475569').text(
      `Income of ${money(settings, totalIncome)} minus expenses of ${money(settings, totalExpense)} results in a ${isProfit ? 'profit' : 'loss'} of ${money(settings, Math.abs(netProfit))} (${marginPct}% margin) for ${periodLabel}.`,
      58,
      doc.y + 22,
      { width: 489, lineGap: 2 }
    );
    doc.y += 54;

    doc.moveDown(2);
    doc.moveTo(48, doc.y).lineTo(557, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by ${settings?.company_name || 'Madal ICT Solutions'} · ${dayjs().format('DD MMM YYYY HH:mm')}`,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateMemberStatementPdf = async ({ statement, fromDate, toDate, settings }) => {
  ensureReportsDir();
  const member = statement?.member ?? {};
  const totals = statement?.totals ?? {};
  const rows = statement?.rows ?? [];
  const filename = `member-statement-${String(member.member_name || 'member')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  const charged = Number(totals.charged ?? 0);
  const paid = Number(totals.paid ?? 0);
  const loans = Number(totals.loans ?? 0);
  const outstanding = Number(totals.outstanding ?? 0);
  const loanBalance = Number(totals.loan_balance ?? 0);
  const closingBalance = Number(totals.closing_balance ?? 0);
  const periodLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format('DD MMM YYYY')} – ${dayjs(toDate).format('DD MMM YYYY')}`
      : 'All time';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Member statement', member.member_name || 'Member');

    addMetaGrid(doc, [
      { label: 'Period from', value: fromDate ? dayjs(fromDate).format('DD MMM YYYY') : '—' },
      { label: 'Period to', value: toDate ? dayjs(toDate).format('DD MMM YYYY') : '—' },
      { label: 'Generated', value: dayjs().format('DD MMM YYYY HH:mm') },
      { label: 'Outstanding', value: money(settings, outstanding) },
    ]);

    addPartyCard(doc, 'Member', member.member_name || '—', [
      member.position ? `Position: ${member.position}` : null,
      member.email,
      member.phone,
      member.joined_date ? `Joined ${dayjs(member.joined_date).format('DD MMM YYYY')}` : null,
    ]);

    const cardY = doc.y + 6;
    const cardW = 120;
    const cardH = 58;
    const cards = [
      { label: 'Dues charged', value: money(settings, charged), fill: '#fffbeb', stroke: '#fde68a', color: '#d97706' },
      { label: 'Loans given', value: money(settings, loans), fill: '#fff7ed', stroke: '#fed7aa', color: '#ea580c' },
      { label: 'Total paid', value: money(settings, paid), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Loan balance', value: money(settings, loanBalance), fill: '#fff1f2', stroke: '#fecdd3', color: '#e11d48' },
    ];
    cards.forEach((card, i) => {
      const x = 48 + (i % 2) * (cardW + 10);
      const y = cardY + Math.floor(i / 2) * (cardH + 8);
      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, y + 12, { width: cardW - 24 });
      doc.fontSize(15).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, y + 30, { width: cardW - 24 });
    });
    doc.y = cardY + (cardH + 8) * 2 + 10;

    const tableTop = doc.y + 4;
    const colX = { date: 48, time: 88, type: 124, ref: 178, due: 352, paid: 412, loan: 472, balance: 522 };
    const drawHeader = (y) => {
      doc.rect(48, y, 509, 20).fill('#101848');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DATE', colX.date, y + 6, { width: 36 });
      doc.text('TIME', colX.time, y + 6, { width: 32 });
      doc.text('TYPE', colX.type, y + 6, { width: 50 });
      doc.text('REFERENCE', colX.ref, y + 6, { width: 168 });
      doc.text('DEBIT', colX.due, y + 6, { width: 54, align: 'right' });
      doc.text('CREDIT', colX.paid, y + 6, { width: 54, align: 'right' });
      doc.text('LOAN', colX.loan, y + 6, { width: 44, align: 'right' });
      doc.text('BALANCE', colX.balance, y + 6, { width: 35, align: 'right' });
    };

    drawHeader(tableTop);
    let y = tableTop + 24;

    if (!rows.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('No transactions for this period.', 58, y + 4);
      y += 28;
    } else {
      rows.forEach((row, i) => {
        if (y > 720) {
          doc.addPage();
          y = 48;
          drawHeader(y);
          y += 24;
        }
        if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(row.date, colX.date, y + 5, { width: 36 });
        doc.text(row.time, colX.time, y + 5, { width: 32 });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(row.type || '—', colX.type, y + 5, { width: 50 });
        doc.font('Helvetica').fillColor('#475569').text(row.reference || row.description || '—', colX.ref, y + 5, { width: 168 });
        doc.fillColor('#e11d48').text(row.due > 0 ? money(settings, row.due) : '—', colX.due, y + 5, { width: 54, align: 'right' });
        doc.fillColor('#059669').text(row.paid > 0 ? money(settings, row.paid) : '—', colX.paid, y + 5, { width: 54, align: 'right' });
        doc.fillColor('#ea580c').text(row.loan > 0 ? money(settings, row.loan) : '—', colX.loan, y + 5, { width: 44, align: 'right' });
        const balanceLabel = money(settings, row.balance);
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(balanceLabel, colX.balance, y + 5, { width: 37, align: 'right' });
        y += 22;
      });
    }
    doc.y = y + 10;

    doc.roundedRect(48, doc.y, 509, 40, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text('SUMMARY', 58, doc.y + 10);
    doc.fontSize(9).font('Helvetica').fillColor('#475569').text(
      `${member.member_name || 'Member'} was charged ${money(settings, charged)} in dues, received ${money(settings, loans)} in loans, paid ${money(settings, paid)} back, with ${money(settings, outstanding)} dues and ${money(settings, loanBalance)} loan still outstanding. Net balance: ${money(settings, closingBalance)}.`,
      58,
      doc.y + 22,
      { width: 489, lineGap: 2 }
    );
    doc.y += 50;

    doc.moveDown(1.5);
    doc.moveTo(48, doc.y).lineTo(557, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by ${settings?.company_name || 'Madal ICT Solutions'} · ${dayjs().format('DD MMM YYYY HH:mm')}`,
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateCustomerStatementPdf = async ({ statement, fromDate, toDate, settings }) => {
  ensureReportsDir();
  const customer = statement?.customer ?? {};
  const totals = statement?.totals ?? {};
  const rows = statement?.rows ?? [];
  const filename = `customer-statement-${String(customer.customer_code || customer.customer_name || 'customer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);
  const periodLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format('DD MMM YYYY')} – ${dayjs(toDate).format('DD MMM YYYY')}`
      : 'All time';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Customer statement', customer.customer_name || 'Customer');
    addMetaGrid(doc, [
      { label: 'Period from', value: fromDate ? dayjs(fromDate).format('DD MMM YYYY') : '—' },
      { label: 'Period to', value: toDate ? dayjs(toDate).format('DD MMM YYYY') : '—' },
      { label: 'Generated', value: dayjs().format('DD MMM YYYY HH:mm') },
      { label: 'Outstanding', value: money(settings, totals.outstanding ?? 0) },
    ]);
    addPartyCard(doc, 'Customer', customer.customer_name || '—', [
      customer.customer_code ? `Code: ${customer.customer_code}` : null,
      customer.company_name,
      customer.phone,
      customer.email,
    ]);

    const cardY = doc.y + 6;
    const cardW = 163;
    const cardH = 58;
    const cards = [
      { label: 'Total invoiced', value: money(settings, totals.invoiced ?? 0), fill: '#eff6ff', stroke: '#bfdbfe', color: '#2563eb' },
      { label: 'Total paid', value: money(settings, totals.paid ?? 0), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Outstanding', value: money(settings, totals.outstanding ?? 0), fill: '#fff1f2', stroke: '#fecdd3', color: '#e11d48' },
    ];
    cards.forEach((card, i) => {
      const x = 48 + i * (cardW + 10);
      doc.roundedRect(x, cardY, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, cardY + 12, { width: cardW - 24 });
      doc.fontSize(15).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, cardY + 30, { width: cardW - 24 });
    });
    doc.y = cardY + cardH + 16;

    const colX = { date: 48, time: 88, type: 124, ref: 178, debit: 392, credit: 462, balance: 522 };
    const drawHeader = (y) => {
      doc.rect(48, y, 509, 20).fill('#101848');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DATE', colX.date, y + 6, { width: 36 });
      doc.text('TIME', colX.time, y + 6, { width: 32 });
      doc.text('TYPE', colX.type, y + 6, { width: 50 });
      doc.text('REFERENCE', colX.ref, y + 6, { width: 208 });
      doc.text('DEBIT', colX.debit, y + 6, { width: 64, align: 'right' });
      doc.text('CREDIT', colX.credit, y + 6, { width: 54, align: 'right' });
      doc.text('BALANCE', colX.balance, y + 6, { width: 35, align: 'right' });
    };

    const tableTop = doc.y + 4;
    drawHeader(tableTop);
    let y = tableTop + 24;
    if (!rows.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('No transactions for this period.', 58, y + 4);
    } else {
      rows.forEach((row, i) => {
        if (y > 720) {
          doc.addPage();
          y = 48;
          drawHeader(y);
          y += 24;
        }
        if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(row.date, colX.date, y + 5, { width: 36 });
        doc.text(row.time, colX.time, y + 5, { width: 32 });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(row.type || '—', colX.type, y + 5, { width: 50 });
        doc.font('Helvetica').fillColor('#475569').text(row.reference || row.description || '—', colX.ref, y + 5, { width: 208 });
        doc.fillColor('#e11d48').text(row.debit > 0 ? money(settings, row.debit) : '—', colX.debit, y + 5, { width: 64, align: 'right' });
        doc.fillColor('#059669').text(row.credit > 0 ? money(settings, row.credit) : '—', colX.credit, y + 5, { width: 54, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(money(settings, row.balance), colX.balance, y + 5, { width: 35, align: 'right' });
        y += 22;
      });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateAccountBalancesPdf = async ({ data, settings }) => {
  ensureReportsDir();
  const accounts = data?.accounts ?? [];
  const total = Number(data?.total ?? 0);
  const filename = `account-balances-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Account balances', dayjs().format('DD MMM YYYY'));
    addAmountHero(doc, 'Total balance', money(settings, total), '#101848', { fill: '#eff6ff', stroke: '#bfdbfe' });

    const colX = { institution: 48, number: 280, balance: 460 };
    const drawHeader = (y) => {
      doc.rect(48, y, 509, 20).fill('#101848');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('INSTITUTION', colX.institution, y + 6, { width: 220 });
      doc.text('ACCOUNT #', colX.number, y + 6, { width: 170 });
      doc.text('BALANCE', colX.balance, y + 6, { width: 97, align: 'right' });
    };

    let y = doc.y + 8;
    drawHeader(y);
    y += 24;
    accounts.forEach((account, i) => {
      if (y > 720) {
        doc.addPage();
        y = 48;
        drawHeader(y);
        y += 24;
      }
      if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
      const label = `${account.institution}${account.is_default ? ' (Default)' : ''}`;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(label, colX.institution, y + 5, { width: 220 });
      doc.font('Helvetica').fillColor('#475569').text(account.number, colX.number, y + 5, { width: 170 });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(money(settings, account.balance), colX.balance, y + 5, { width: 97, align: 'right' });
      y += 22;
    });

    doc.moveTo(48, y + 4).lineTo(557, y + 4).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Total', colX.institution, y + 12, { width: 220 });
    doc.text(money(settings, total), colX.balance, y + 12, { width: 97, align: 'right' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateAccountStatementPdf = async ({ statement, fromDate, toDate, settings }) => {
  ensureReportsDir();
  const account = statement?.account ?? {};
  const totals = statement?.totals ?? {};
  const rows = statement?.rows ?? [];
  const filename = `account-statement-${String(account.institution || 'account')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Account statement', account.institution || 'Account');
    addMetaGrid(doc, [
      { label: 'Period from', value: fromDate ? dayjs(fromDate).format('DD MMM YYYY') : '—' },
      { label: 'Period to', value: toDate ? dayjs(toDate).format('DD MMM YYYY') : '—' },
      { label: 'Account #', value: account.number || '—' },
      { label: 'Current balance', value: money(settings, totals.balance ?? account.balance ?? 0) },
    ]);

    const cardY = doc.y + 6;
    const cardW = 163;
    const cardH = 58;
    const cards = [
      { label: 'Debit (receipts)', value: money(settings, totals.debits ?? 0), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Credit (payments)', value: money(settings, totals.credits ?? 0), fill: '#fff1f2', stroke: '#fecdd3', color: '#e11d48' },
      { label: 'Balance', value: money(settings, totals.balance ?? account.balance ?? 0), fill: '#eff6ff', stroke: '#bfdbfe', color: '#101848' },
    ];
    cards.forEach((card, i) => {
      const x = 48 + i * (cardW + 10);
      doc.roundedRect(x, cardY, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, cardY + 12, { width: cardW - 24 });
      doc.fontSize(15).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, cardY + 30, { width: cardW - 24 });
    });
    doc.y = cardY + cardH + 16;

    const colX = { date: 48, time: 84, type: 116, ref: 168, debit: 330, credit: 390, loan: 450, balance: 510 };
    const drawHeader = (y) => {
      doc.rect(48, y, 509, 20).fill('#101848');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DATE', colX.date, y + 6, { width: 32 });
      doc.text('TIME', colX.time, y + 6, { width: 28 });
      doc.text('TYPE', colX.type, y + 6, { width: 48 });
      doc.text('REFERENCE', colX.ref, y + 6, { width: 156 });
      doc.text('DEBIT', colX.debit, y + 6, { width: 54, align: 'right' });
      doc.text('CREDIT', colX.credit, y + 6, { width: 54, align: 'right' });
      doc.text('LOAN', colX.loan, y + 6, { width: 54, align: 'right' });
      doc.text('BAL', colX.balance, y + 6, { width: 47, align: 'right' });
    };

    const tableTop = doc.y + 4;
    drawHeader(tableTop);
    let y = tableTop + 24;
    if (!rows.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('No movements for this period.', 58, y + 4);
    } else {
      rows.forEach((row, i) => {
        if (y > 720) {
          doc.addPage();
          y = 48;
          drawHeader(y);
          y += 24;
        }
        if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
        doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(row.date, colX.date, y + 5, { width: 32 });
        doc.text(row.time, colX.time, y + 5, { width: 28 });
        doc.text(row.type, colX.type, y + 5, { width: 48 });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(row.reference || row.description || '—', colX.ref, y + 5, { width: 156 });
        doc.font('Helvetica').fillColor('#059669').text(row.debit > 0 ? money(settings, row.debit) : '—', colX.debit, y + 5, { width: 54, align: 'right' });
        doc.fillColor('#e11d48').text(row.credit > 0 ? money(settings, row.credit) : '—', colX.credit, y + 5, { width: 54, align: 'right' });
        doc.fillColor('#ea580c').text(row.loan > 0 ? money(settings, row.loan) : '—', colX.loan, y + 5, { width: 54, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(money(settings, row.balance), colX.balance, y + 5, { width: 47, align: 'right' });
        y += 22;
      });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateCashFlowPdf = async ({ rows, fromDate, toDate, settings }) => {
  ensureReportsDir();
  const filename = `cash-flow-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);
  const periodLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format('DD MMM YYYY')} – ${dayjs(toDate).format('DD MMM YYYY')}`
      : 'All time';
  const dataRows = (rows ?? []).filter((r) => r.description !== 'Total');
  const totalRow = (rows ?? []).find((r) => r.description === 'Total') ?? {};
  const inflow = Number(totalRow.inflow ?? 0);
  const outflow = Number(totalRow.outflow ?? 0);
  const net = Number(totalRow.net ?? inflow - outflow);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, layout: 'landscape' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Cash flow', periodLabel);
    const cardY = doc.y + 6;
    const cardW = 240;
    const cardH = 58;
    const cards = [
      { label: 'Total inflow', value: money(settings, inflow), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Total outflow', value: money(settings, outflow), fill: '#fff1f2', stroke: '#fecdd3', color: '#e11d48' },
      { label: 'Net cash', value: money(settings, net), fill: '#eff6ff', stroke: '#bfdbfe', color: '#101848' },
    ];
    cards.forEach((card, i) => {
      const x = 48 + i * (cardW + 12);
      doc.roundedRect(x, cardY, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, cardY + 12, { width: cardW - 24 });
      doc.fontSize(15).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, cardY + 30, { width: cardW - 24 });
    });
    doc.y = cardY + cardH + 16;

    const colX = { desc: 48, date: 300, time: 360, inflow: 410, outflow: 490, net: 570, balance: 650 };
    const drawHeader = (y) => {
      doc.rect(48, y, 749, 20).fill('#101848');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DESCRIPTION', colX.desc, y + 6, { width: 240 });
      doc.text('DATE', colX.date, y + 6, { width: 52 });
      doc.text('TIME', colX.time, y + 6, { width: 42 });
      doc.text('INFLOW', colX.inflow, y + 6, { width: 72, align: 'right' });
      doc.text('OUTFLOW', colX.outflow, y + 6, { width: 72, align: 'right' });
      doc.text('NET', colX.net, y + 6, { width: 72, align: 'right' });
      doc.text('BALANCE', colX.balance, y + 6, { width: 72, align: 'right' });
    };

    const tableTop = doc.y + 4;
    drawHeader(tableTop);
    let y = tableTop + 24;
    dataRows.forEach((row, i) => {
      if (y > 500) {
        doc.addPage();
        y = 48;
        drawHeader(y);
        y += 24;
      }
      if (i % 2 === 1) doc.rect(48, y, 749, 20).fill('#f8fafc');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(row.description, colX.desc, y + 5, { width: 240 });
      doc.font('Helvetica').fillColor('#475569').text(row.date || '—', colX.date, y + 5, { width: 52 });
      doc.text(row.time || '—', colX.time, y + 5, { width: 42 });
      doc.fillColor('#059669').text(row.inflow ? money(settings, row.inflow) : '—', colX.inflow, y + 5, { width: 72, align: 'right' });
      doc.fillColor('#e11d48').text(row.outflow ? money(settings, row.outflow) : '—', colX.outflow, y + 5, { width: 72, align: 'right' });
      doc.fillColor('#0f172a').text(money(settings, row.net ?? 0), colX.net, y + 5, { width: 72, align: 'right' });
      doc.font('Helvetica-Bold').text(money(settings, row.balance ?? 0), colX.balance, y + 5, { width: 72, align: 'right' });
      y += 22;
    });

    doc.moveTo(48, y + 4).lineTo(797, y + 4).strokeColor('#e2e8f0').stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Total', colX.desc, y + 10, { width: 240 });
    doc.fillColor('#059669').text(money(settings, inflow), colX.inflow, y + 10, { width: 72, align: 'right' });
    doc.fillColor('#e11d48').text(money(settings, outflow), colX.outflow, y + 10, { width: 72, align: 'right' });
    doc.fillColor('#0f172a').text(money(settings, net), colX.net, y + 10, { width: 72, align: 'right' });
    doc.text(money(settings, totalRow.balance ?? 0), colX.balance, y + 10, { width: 72, align: 'right' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export const generateContributionReportPdf = async ({ report, settings }) => {
  ensureReportsDir();
  const summary = report?.summary ?? {};
  const dues = report?.dues ?? [];
  const filename = `member-contributions-${summary.month ?? ''}-${summary.year ?? ''}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);
  const period = summary.month && summary.year ? `${summary.month}/${summary.year}` : 'Current batch';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    addDocTitle(doc, 'Member contributions', period);
    const cardY = doc.y + 6;
    const cardW = 120;
    const cardH = 58;
    const cards = [
      { label: 'Expected', value: money(settings, summary.expected ?? 0), fill: '#eff6ff', stroke: '#bfdbfe', color: '#2563eb' },
      { label: 'Collected', value: money(settings, summary.collected ?? 0), fill: '#ecfdf5', stroke: '#bbf7d0', color: '#059669' },
      { label: 'Pending', value: String(summary.pending ?? 0), fill: '#fffbeb', stroke: '#fde68a', color: '#d97706' },
      { label: 'Paid', value: String(summary.paid ?? 0), fill: '#f0fdf4', stroke: '#bbf7d0', color: '#059669' },
    ];
    cards.forEach((card, i) => {
      const x = 48 + (i % 2) * (cardW + 10);
      const y = cardY + Math.floor(i / 2) * (cardH + 8);
      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke(card.fill, card.stroke);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text(card.label.toUpperCase(), x + 12, y + 12, { width: cardW - 24 });
      doc.fontSize(15).font('Helvetica-Bold').fillColor(card.color).text(card.value, x + 12, y + 30, { width: cardW - 24 });
    });
    doc.y = cardY + (cardH + 8) * 2 + 12;

    const colX = { member: 48, due: 300, paid: 390, balance: 470, status: 540 };
    const drawHeader = (y) => {
      doc.rect(48, y, 509, 20).fill('#101848');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('MEMBER', colX.member, y + 6, { width: 240 });
      doc.text('DUE', colX.due, y + 6, { width: 80, align: 'right' });
      doc.text('PAID', colX.paid, y + 6, { width: 70, align: 'right' });
      doc.text('BALANCE', colX.balance, y + 6, { width: 60, align: 'right' });
      doc.text('STATUS', colX.status, y + 6, { width: 60, align: 'right' });
    };

    const tableTop = doc.y + 4;
    drawHeader(tableTop);
    let y = tableTop + 24;
    dues.forEach((due, i) => {
      if (y > 720) {
        doc.addPage();
        y = 48;
        drawHeader(y);
        y += 24;
      }
      if (i % 2 === 1) doc.rect(48, y, 509, 20).fill('#f8fafc');
      const amount = Number(due.amount ?? 0);
      const paid = Number(due.paid_amount ?? 0);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(due.member_name || '—', colX.member, y + 5, { width: 240 });
      doc.font('Helvetica').fillColor('#475569').text(money(settings, amount), colX.due, y + 5, { width: 80, align: 'right' });
      doc.fillColor('#059669').text(money(settings, paid), colX.paid, y + 5, { width: 70, align: 'right' });
      doc.fillColor('#e11d48').text(money(settings, amount - paid), colX.balance, y + 5, { width: 60, align: 'right' });
      doc.fillColor('#64748b').text(String(due.status ?? 'Pending'), colX.status, y + 5, { width: 60, align: 'right' });
      y += 22;
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

/**
 * Generic PDF report generator (tabulated data with a title).
 */
export const generateReportPdf = async ({ title, subtitle, columns, rows, settings }) => {
  ensureReportsDir();
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`;
  const filePath = path.join(env.dirs.reports, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCompanyHeader(doc, settings);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(title);
    if (subtitle) doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(subtitle);
    doc.moveDown(1);

    const colWidth = 509 / columns.length;
    doc.fontSize(8.5);
    doc.font('Helvetica-Bold').fillColor('#ffffff');
    columns.forEach((c, i) => {
      doc.rect(48 + i * colWidth, doc.y, colWidth, 18).fill('#334155');
    });
    columns.forEach((c, i) => {
      doc.fillColor('#ffffff').text(String(c.header).toUpperCase(), 48 + i * colWidth + 4, doc.y - 13, { width: colWidth - 8 });
    });
    doc.moveDown(0.9);

    doc.font('Helvetica').fontSize(8.5);
    rows.forEach((row, r) => {
      if (r % 2 === 1) doc.rect(48, doc.y, 509, 16).fill('#f8fafc');
      columns.forEach((c, i) => {
        doc.fillColor('#0f172a').text(String(row[c.key] ?? ''), 48 + i * colWidth + 4, doc.y, { width: colWidth - 8 });
      });
      doc.moveDown(1.05);
      if (doc.y > 740) {
        doc.addPage();
      }
    });

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#94a3b8').text(`Generated by Madal ICT Solutions · ${dayjs().format('DD MMM YYYY HH:mm')}`, { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filePath };
};

export { REFERENCE_TYPES };
