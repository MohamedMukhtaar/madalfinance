-- Other income belongs to a cash/bank account.

ALTER TABLE other_income
    ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(account_id);

UPDATE other_income
   SET account_id = COALESCE(
         (SELECT account_id FROM accounts WHERE is_default = TRUE LIMIT 1),
         (SELECT account_id FROM accounts ORDER BY account_id LIMIT 1)
       )
 WHERE account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_otherincome_account ON other_income(account_id);
