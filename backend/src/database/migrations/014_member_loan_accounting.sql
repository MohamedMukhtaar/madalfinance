-- Reclassify member credit payouts as loans (balance-sheet), not P&L expenses.

UPDATE transactions
   SET transaction_type = 'Loan',
       reference_type = 'Member Loan',
       description = REPLACE(description, 'Member credit', 'Member loan')
 WHERE reference_type = 'Member Credit'
   AND transaction_type = 'Expense';
