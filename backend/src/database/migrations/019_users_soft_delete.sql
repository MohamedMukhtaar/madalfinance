ALTER TABLE users
  ADD COLUMN deleted_at DATETIME NULL AFTER updated_at,
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

CREATE INDEX idx_users_deleted ON users(deleted_at);
