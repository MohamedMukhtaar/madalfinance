-- Bank / cash accounts with balances, transfers, and payment linkage.

CREATE TABLE IF NOT EXISTS accounts (
  acc_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number       VARCHAR(50) NOT NULL UNIQUE,
  institution  VARCHAR(150) NOT NULL,
  balance      DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  is_default   TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_transfers (
  transfer_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_acc_id    INT UNSIGNED NOT NULL,
  to_acc_id      INT UNSIGNED NOT NULL,
  amount         DECIMAL(15, 2) NOT NULL,
  transfer_date  DATE NOT NULL,
  notes          TEXT,
  created_by     INT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transfer_from FOREIGN KEY (from_acc_id) REFERENCES accounts(acc_id),
  CONSTRAINT fk_transfer_to FOREIGN KEY (to_acc_id) REFERENCES accounts(acc_id),
  CONSTRAINT fk_transfer_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_account_transfers_date ON account_transfers(transfer_date);

-- Add columns if missing (safe re-run)
SET @db = DATABASE();

SET @has_pay_acc = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'acc_id'
);
SET @sql_pay = IF(@has_pay_acc = 0,
  'ALTER TABLE payments ADD COLUMN acc_id INT UNSIGNED NULL AFTER amount, ADD CONSTRAINT fk_payments_account FOREIGN KEY (acc_id) REFERENCES accounts(acc_id)',
  'SELECT 1');
PREPARE stmt FROM @sql_pay; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_exp_acc = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'expenses' AND COLUMN_NAME = 'acc_id'
);
SET @sql_exp = IF(@has_exp_acc = 0,
  'ALTER TABLE expenses ADD COLUMN acc_id INT UNSIGNED NULL AFTER amount, ADD CONSTRAINT fk_expenses_account FOREIGN KEY (acc_id) REFERENCES accounts(acc_id)',
  'SELECT 1');
PREPARE stmt FROM @sql_exp; EXECUTE stmt; DEALLOCATE PREPARE stmt;
