import ApiError from '../utils/ApiError.js';

/**
 * Generates the next sequential document number for a given table/column
 * using the configured prefix. Must run inside a transaction so the
 * UNIQUE constraint on the column protects against races.
 *
 * @param {object} conn mysql2 connection (transaction)
 * @param {string} table
 * @param {string} column  e.g. invoice_number
 * @param {string} prefix  e.g. INV-
 * @param {number} pad
 */
export const generateNumber = async (conn, table, column, prefix, pad = 6) => {
  const safeTable = /^[a-z_]+$/.test(table) ? table : null;
  const safeCol = /^[a-z_]+$/.test(column) ? column : null;
  if (!safeTable || !safeCol) throw ApiError.internal('Invalid number generator arguments');

  const [row] = await conn.query(
    `SELECT ${safeCol} AS last_number
       FROM ${safeTable}
      WHERE ${safeCol} LIKE CONCAT(?, '%')
      ORDER BY ${safeCol} DESC
      LIMIT 1`,
    [prefix]
  );

  let seq = 1;
  if (row.length > 0) {
    const match = String(row[0].last_number).match(/(\d+)\s*$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(pad, '0')}`;
};

export const invoiceNumber = (conn, prefix, pad) =>
  generateNumber(conn, 'invoices', 'invoice_number', prefix, pad);

export const paymentNumber = (conn, prefix, pad) =>
  generateNumber(conn, 'payments', 'payment_number', prefix, pad);

export const contractNumber = (conn, prefix, pad) =>
  generateNumber(conn, 'contracts', 'contract_number', prefix, pad);

export default generateNumber;
