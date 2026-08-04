import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import env from '../config/index.js';

const ensureReportsDir = () => {
  if (!fs.existsSync(env.dirs.reports)) fs.mkdirSync(env.dirs.reports, { recursive: true });
};

/**
 * Generates an Excel (.xlsx) workbook from tabular data.
 *
 * @param {{ title: string, subtitle?: string, columns: { header: string, key: string, width?: number }[], rows: object[] }} opts
 * @returns {Promise<{filename: string, filePath: string}>}
 */
export const generateExcel = async ({ title, subtitle, columns, rows }) => {
  ensureReportsDir();
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
  const filePath = path.join(env.dirs.reports, filename);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Madal ICT Solutions';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31));

  if (subtitle) {
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = subtitle;
    sheet.getCell('A1').font = { italic: true, color: { argb: 'FF64748B' } };
  }

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 24,
  }));

  sheet.getRow(subtitle ? 2 : 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const headerRow = sheet.getRow(subtitle ? 2 : 1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle' };
  });

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  sheet.autoFilter = { from: { row: subtitle ? 2 : 1, column: 1 }, to: { row: subtitle ? 2 : 1, column: columns.length } };

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
