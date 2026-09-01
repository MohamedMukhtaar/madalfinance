ALTER TABLE audit_logs
  ADD COLUMN details VARCHAR(500) NULL AFTER device;
