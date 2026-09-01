-- Ensure accounts.is_default exists (older installs may have accounts without this column).

SET @db = DATABASE();

SET @has_is_default = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'is_default'
);
SET @sql_is_default = IF(@has_is_default = 0,
  'ALTER TABLE accounts ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0 AFTER balance',
  'SELECT 1');
PREPARE stmt FROM @sql_is_default; EXECUTE stmt; DEALLOCATE PREPARE stmt;
