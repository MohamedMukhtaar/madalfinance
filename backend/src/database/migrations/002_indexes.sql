-- Additive indexes for production query performance.
-- Applied once via schema_migrations tracking.

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX idx_payments_customer_date ON payments(customer_id, payment_date);
CREATE INDEX idx_expenses_category_date ON expenses(expense_category_id, expense_date);
CREATE INDEX idx_projects_customer_type ON projects(customer_id, project_type_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_transactions_type_date ON transactions(transaction_type, transaction_date);
