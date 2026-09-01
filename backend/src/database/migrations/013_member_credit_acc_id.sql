-- Link member credit payouts to the account debited.

SET @db = DATABASE();

SET @has_acc_id = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'member_credit_ledger' AND COLUMN_NAME = 'acc_id'
);
SET @sql_acc_id = IF(@has_acc_id = 0,
  'ALTER TABLE member_credit_ledger ADD COLUMN acc_id INT UNSIGNED NULL AFTER credit_date',
  'SELECT 1');
PREPARE stmt FROM @sql_acc_id; EXECUTE stmt; DEALLOCATE PREPARE stmt;
