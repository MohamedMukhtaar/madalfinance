-- Speed up account statement queries.
CREATE INDEX idx_payments_acc_date ON payments (acc_id, deleted_at, payment_date);
CREATE INDEX idx_expenses_acc_date ON expenses (acc_id, deleted_at, expense_date);
CREATE INDEX idx_member_credit_ledger_acc_date ON member_credit_ledger (acc_id, credit_date);
