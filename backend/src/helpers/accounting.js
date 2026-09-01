export const MOVEMENT_IN = new Set(['income', 'transfer_in', 'loan_repay']);
export const MOVEMENT_OUT = new Set(['expense', 'transfer_out', 'loan_out']);

export const toAccounting = (row) => {
  const amt = Number(row.amount);
  const debit = MOVEMENT_IN.has(row.movement_type) ? amt : 0;
  const credit = MOVEMENT_OUT.has(row.movement_type) ? amt : 0;
  return { debit, credit };
};

export const movementNet = (rows) =>
  (rows ?? []).reduce((sum, row) => {
    const { debit, credit } = toAccounting(row);
    return Math.round((sum + debit - credit) * 100) / 100;
  }, 0);

export const computeOpeningBalance = (accountBalance, periodNet, afterFromNet, fromDate) => {
  const balance = Number(accountBalance);
  if (fromDate) {
    return Math.round((balance - afterFromNet) * 100) / 100;
  }
  return Math.round((balance - periodNet) * 100) / 100;
};

export const applyRunningBalances = (rows, openingBalance, { includeOpeningRow = true } = {}) => {
  let balance = openingBalance;
  const result = [];

  if (includeOpeningRow && Math.abs(openingBalance) > 0.001) {
    result.push({
      movement_date: rows[0]?.movement_date ?? new Date(),
      movement_type: 'opening',
      amount: Math.abs(openingBalance),
      reference_label: 'OPEN',
      description: 'Opening balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      balance: openingBalance,
    });
  }

  for (const row of rows) {
    const { debit, credit } = toAccounting(row);
    balance = Math.round((balance + debit - credit) * 100) / 100;
    result.push({ ...row, debit, credit, balance });
  }

  return result;
};
