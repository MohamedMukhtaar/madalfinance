-- Delete reason + who deleted (for soft-deleted records)
ALTER TABLE customers
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE projects
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE contracts
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE invoices
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE payments
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE expenses
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

ALTER TABLE other_income
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

-- Members: soft-delete (trash) instead of only status deactivate
ALTER TABLE members
  ADD COLUMN deleted_at DATETIME NULL AFTER status,
  ADD COLUMN delete_reason VARCHAR(500) NULL AFTER deleted_at,
  ADD COLUMN deleted_by INT NULL AFTER delete_reason;

CREATE INDEX idx_members_deleted ON members(deleted_at);

-- Unified trash bin for restore UI
CREATE TABLE IF NOT EXISTS trash_bin (
  trash_id       INT AUTO_INCREMENT PRIMARY KEY,
  entity_type    VARCHAR(50) NOT NULL,
  entity_id      INT NOT NULL,
  entity_label   VARCHAR(255) NOT NULL,
  delete_reason  VARCHAR(500) NOT NULL,
  deleted_by     INT NULL,
  deleted_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trash_entity (entity_type, entity_id),
  CONSTRAINT fk_trash_user FOREIGN KEY (deleted_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_trash_deleted_at ON trash_bin(deleted_at);
CREATE INDEX idx_trash_type ON trash_bin(entity_type);
