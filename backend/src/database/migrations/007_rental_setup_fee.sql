ALTER TABLE rental_billings
  ADD COLUMN setup_fee DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monthly_amount,
  ADD COLUMN setup_invoice_id INT NULL AFTER setup_fee;

ALTER TABLE rental_billings
  ADD CONSTRAINT fk_rental_setup_invoice
    FOREIGN KEY (setup_invoice_id) REFERENCES invoices(invoice_id)
    ON DELETE SET NULL;
