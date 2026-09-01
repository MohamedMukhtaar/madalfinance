-- Background export job queue for large PDF/Excel reports.
CREATE TABLE IF NOT EXISTS export_jobs (
  job_id        INT AUTO_INCREMENT PRIMARY KEY,
  kind          VARCHAR(64) NOT NULL,
  format        VARCHAR(8) NOT NULL,
  params        JSON NULL,
  status        ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  file_path     VARCHAR(512) NULL,
  error_message TEXT NULL,
  created_by    INT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP NULL,
  CONSTRAINT fk_export_jobs_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

SET @db = DATABASE();
SET @has_export_idx = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'export_jobs' AND INDEX_NAME = 'idx_export_jobs_status'
);
SET @sql_export_idx = IF(@has_export_idx = 0,
  'CREATE INDEX idx_export_jobs_status ON export_jobs (status, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql_export_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Medium-term: store per-account balance snapshots to avoid global chain recompute.
CREATE TABLE IF NOT EXISTS account_balance_snapshots (
  snapshot_id   INT AUTO_INCREMENT PRIMARY KEY,
  acc_id        INT UNSIGNED NOT NULL,
  snapshot_date DATE NOT NULL,
  balance       DECIMAL(14,2) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_snapshot (acc_id, snapshot_date),
  CONSTRAINT fk_snapshot_account FOREIGN KEY (acc_id) REFERENCES accounts(acc_id)
);
