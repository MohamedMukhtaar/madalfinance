import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toAccounting,
  movementNet,
  computeOpeningBalance,
  applyRunningBalances,
} from '../src/helpers/accounting.js';
import { deriveInvoiceStatus, distributeAllocationAmounts } from '../src/helpers/paymentAllocation.js';

test('toAccounting maps receipts to debit and payments to credit', () => {
  assert.deepEqual(toAccounting({ movement_type: 'income', amount: 100 }), { debit: 100, credit: 0 });
  assert.deepEqual(toAccounting({ movement_type: 'expense', amount: 40 }), { debit: 0, credit: 40 });
  assert.deepEqual(toAccounting({ movement_type: 'transfer_in', amount: 25 }), { debit: 25, credit: 0 });
  assert.deepEqual(toAccounting({ movement_type: 'loan_out', amount: 10 }), { debit: 0, credit: 10 });
});

test('movementNet sums debits minus credits', () => {
  const net = movementNet([
    { movement_type: 'income', amount: 100 },
    { movement_type: 'expense', amount: 30 },
    { movement_type: 'transfer_in', amount: 20 },
  ]);
  assert.equal(net, 90);
});

test('computeOpeningBalance with fromDate uses after-period net', () => {
  const opening = computeOpeningBalance(500, 0, 120, '2026-01-01');
  assert.equal(opening, 380);
});

test('computeOpeningBalance without fromDate uses period net', () => {
  const opening = computeOpeningBalance(500, 80, 0, '');
  assert.equal(opening, 420);
});

test('applyRunningBalances builds opening row and running balance', () => {
  const rows = applyRunningBalances(
    [
      { movement_date: '2026-01-05', movement_type: 'income', amount: 100, reference_label: 'P1', description: 'Pay' },
      { movement_date: '2026-01-06', movement_type: 'expense', amount: 40, reference_label: 'E1', description: 'Exp' },
    ],
    50
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].movement_type, 'opening');
  assert.equal(rows[0].balance, 50);
  assert.equal(rows[1].balance, 150);
  assert.equal(rows[2].balance, 110);
});

test('deriveInvoiceStatus marks invoice paid when allocation covers total', () => {
  const result = deriveInvoiceStatus({ paid_amount: 80, total_amount: 100, status: 'Partial' }, 20);
  assert.deepEqual(result, { paid: 100, status: 'Paid' });
});

test('deriveInvoiceStatus keeps partial when underpaid', () => {
  const result = deriveInvoiceStatus({ paid_amount: 0, total_amount: 100, status: 'Issued' }, 25);
  assert.deepEqual(result, { paid: 25, status: 'Partial' });
});

test('distributeAllocationAmounts preserves total across invoices', () => {
  const allocs = [{ amount_allocated: 60 }, { amount_allocated: 40 }];
  const amounts = distributeAllocationAmounts(allocs, 100, 50);
  assert.equal(amounts.reduce((s, n) => s + n, 0), 50);
  assert.equal(amounts[0], 30);
  assert.equal(amounts[1], 20);
});
