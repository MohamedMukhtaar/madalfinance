-- Contribution charges can be raised at any time and for any reason
-- (monthly dues, office costs, a one-off levy, …), not just once per month.

ALTER TABLE member_due_batches
    ADD COLUMN IF NOT EXISTS reason      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS charge_date DATE;

UPDATE member_due_batches
   SET reason      = COALESCE(reason, 'Monthly contribution'),
       charge_date = COALESCE(charge_date, generated_at::DATE);

ALTER TABLE member_due_batches
    ALTER COLUMN reason      SET NOT NULL,
    ALTER COLUMN charge_date SET NOT NULL,
    ALTER COLUMN charge_date SET DEFAULT CURRENT_DATE;

-- Drop the one-batch-per-month rule (UNIQUE (month, year)).
DO $$
DECLARE c TEXT;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'member_due_batches'::regclass AND contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE member_due_batches DROP CONSTRAINT %I', c);
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_member_due_batches_period ON member_due_batches (year, month);
CREATE INDEX IF NOT EXISTS idx_member_due_batches_charge_date ON member_due_batches (charge_date);
