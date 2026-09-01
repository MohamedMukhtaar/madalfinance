ALTER TABLE projects
  ADD COLUMN logo_path VARCHAR(500) NULL AFTER description,
  ADD COLUMN logo_file_name VARCHAR(255) NULL AFTER logo_path,
  ADD COLUMN attachment_path VARCHAR(500) NULL AFTER logo_file_name,
  ADD COLUMN attachment_file_name VARCHAR(255) NULL AFTER attachment_path;
