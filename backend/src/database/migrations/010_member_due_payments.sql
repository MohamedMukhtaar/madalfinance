-- Track contribution receipts with deposit account (income).

CREATE TABLE IF NOT EXISTS member_due_payments (
  due_payment_id INT AUTO_INCREMENT PRIMARY KEY,
  due_id         INT NOT NULL,
  amount         DECIMAL(15, 2) NOT NULL,
  acc_id         INT UNSIGNED NOT NULL,
  paid_date      DATE NOT NULL,
  created_by     INT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mdp_due FOREIGN KEY (due_id) REFERENCES member_dues(due_id) ON DELETE CASCADE,
  CONSTRAINT fk_mdp_acc FOREIGN KEY (acc_id) REFERENCES accounts(acc_id),
  CONSTRAINT fk_mdp_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_mdp_due ON member_due_payments(due_id);
CREATE INDEX idx_mdp_acc ON member_due_payments(acc_id);
CREATE INDEX idx_mdp_date ON member_due_payments(paid_date);
