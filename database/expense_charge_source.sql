-- Expense charges have two origins:
--   'direct' — created together with a payment when an expense is recorded straight away
--   'charge' — a bill added on the Charges tab, paid later (possibly in parts)
-- Before this, Charges-tab bills lived only in each browser's localStorage.

ALTER TABLE expense_charges
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_expense_charges_source_status ON expense_charges (source, status);
