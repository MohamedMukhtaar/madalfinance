import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import env from '../config/index.js';
import { companyLogo, companyName, companyContact, fitSize } from './branding.js';

const ensureReportsDir = () => {
  if (!fs.existsSync(env.dirs.reports)) fs.mkdirSync(env.dirs.reports, { recursive: true });
};

const colLetter = (n) => {
  let s = '';
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

/**
 * Generates an Excel (.xlsx) workbook from tabular data, headed by the company logo,
 * name and contact details from Settings.
 *
 * @param {{ title: string, subtitle?: string, columns: { header: string, key: string, width?: number }[], rows: object[], settings?: object }} opts
 * @returns {Promise<{filename: string, filePath: string}>}
 */
export const generateExcel = async ({ title, subtitle, columns, rows, settings }) => {
  ensureReportsDir();
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
  const filePath = path.join(env.dirs.reports, filename);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName(settings);
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31), {
    pageSetup: { orientation: columns.length > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width || 24;
  });

  const lastCol = colLetter(Math.max(columns.length, 3));
  // Text sits to the right of the logo when there is room; otherwise it spans the sheet.
  const textStart = columns.length >= 4 ? 'C' : 'A';

  const logo = companyLogo(settings);
  if (logo) {
    const imageId = workbook.addImage({ buffer: logo.buffer, extension: logo.type });
    sheet.addImage(imageId, { tl: { col: 0.1, row: 0.15 }, ext: fitSize(logo, 170, 52), editAs: 'oneCell' });
  }

  const headerLines = [
    { text: companyName(settings), font: { bold: true, size: 16, color: { argb: 'FF101848' } } },
    { text: companyContact(settings), font: { size: 9, color: { argb: 'FF64748B' } } },
    { text: title, font: { bold: true, size: 12, color: { argb: 'FF2563EB' } } },
    { text: subtitle || `Generated ${dayjs().format('DD MMM YYYY HH:mm')}`, font: { italic: true, size: 9, color: { argb: 'FF64748B' } } },
  ];
  headerLines.forEach((line, i) => {
    const r = i + 1;
    sheet.mergeCells(`${textStart}${r}:${lastCol}${r}`);
    const cell = sheet.getCell(`${textStart}${r}`);
    cell.value = line.text;
    cell.font = line.font;
    cell.alignment = { vertical: 'middle' };
    sheet.getRow(r).height = i === 0 ? 22 : 16;
  });

  const headerRowNumber = headerLines.length + 2;
  const headerRow = sheet.getRow(headerRowNumber);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101848' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle' };
  });
  headerRow.height = 20;

  rows.forEach((row) => {
    sheet.addRow(columns.map((c) => row[c.key]));
  });

  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columns.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  sheet.headerFooter.oddFooter = `&L${companyName(settings)}&RPage &P of &N`;

  await workbook.xlsx.writeFile(filePath);
  return { filename, filePath };
};

export const streamExcelResponse = (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return workbook.xlsx.write(res);
};

export default generateExcel;
