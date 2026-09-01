-- Member credit balance and audit ledger (prepayments, adjustments, credit applied to dues).

SET @db = DATABASE();

SET @has_credit_balance = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'members' AND COLUMN_NAME = 'credit_balance'
);
SET @sql_credit_balance = IF(@has_credit_balance = 0,
  'ALTER TABLE members ADD COLUMN credit_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER default_monthly_due',
  'SELECT 1');
PREPARE stmt FROM @sql_credit_balance; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS member_credit_ledger (
  credit_id     INT AUTO_INCREMENT PRIMARY KEY,
  member_id     INT NOT NULL,
  amount        DECIMAL(10, 2) NOT NULL,
  description   VARCHAR(255) NOT NULL,
  credit_date   DATE NOT NULL,
  due_id        INT NULL,
  created_by    INT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mcl_member FOREIGN KEY (member_id) REFERENCES members(member_id),
  CONSTRAINT fk_mcl_due FOREIGN KEY (due_id) REFERENCES member_dues(due_id) ON DELETE SET NULL,
  CONSTRAINT fk_mcl_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_mcl_member ON member_credit_ledger(member_id);
CREATE INDEX idx_mcl_date ON member_credit_ledger(credit_date);
