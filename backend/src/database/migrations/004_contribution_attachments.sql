-- Contribution payment receipts / proof images
CREATE TABLE IF NOT EXISTS member_due_attachments (
  attachment_id  INT AUTO_INCREMENT PRIMARY KEY,
  due_id         INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(255) NOT NULL,
  file_type      VARCHAR(100) NULL,
  uploaded_by    INT NULL,
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dueattach_due FOREIGN KEY (due_id) REFERENCES member_dues(due_id) ON DELETE CASCADE,
  CONSTRAINT fk_dueattach_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_due_attachments_due ON member_due_attachments(due_id);
