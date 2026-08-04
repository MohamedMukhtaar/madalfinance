-- =====================================================================
-- 001_init.sql — Full schema for Madal ICT Finance Management System
-- MySQL 8+ / MariaDB 10.4+ · utf8mb4 · InnoDB
-- Derived from database/schema.sql with additions required by the API:
--   refresh_tokens, soft-delete columns, contract signed-agreement,
--   settings.logo
-- =====================================================================

CREATE DATABASE IF NOT EXISTS finance_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_system;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS expense_attachments;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS other_income;
DROP TABLE IF EXISTS income_categories;
DROP TABLE IF EXISTS member_dues;
DROP TABLE IF EXISTS member_due_batches;
DROP TABLE IF EXISTS payment_attachments;
DROP TABLE IF EXISTS payment_allocations;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_attachments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS rental_billings;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS project_types;
DROP TABLE IF EXISTS customer_contacts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- AUTHENTICATION
-- =====================================================================

CREATE TABLE roles (
  role_id     INT AUTO_INCREMENT PRIMARY KEY,
  role_name   VARCHAR(50) NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id     INT AUTO_INCREMENT PRIMARY KEY,
  role_id     INT NOT NULL,
  username    VARCHAR(50) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20),
  email       VARCHAR(100),
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  token_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  ip_address  VARCHAR(45),
  device      VARCHAR(255),
  is_revoked  TINYINT(1) NOT NULL DEFAULT 0,
  revoked_at  TIMESTAMP NULL DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- =====================================================================
-- COMPANY (co-founders)
-- =====================================================================

CREATE TABLE members (
  member_id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT NOT NULL UNIQUE,
  joined_date          DATE NOT NULL,
  default_monthly_due  DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  position             VARCHAR(50),
  status               ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- =====================================================================
-- CUSTOMERS
-- =====================================================================

CREATE TABLE customers (
  customer_id    INT AUTO_INCREMENT PRIMARY KEY,
  customer_code  VARCHAR(20) UNIQUE,
  customer_name  VARCHAR(150) NOT NULL,
  company_name   VARCHAR(150),
  phone          VARCHAR(20),
  email          VARCHAR(100),
  address        VARCHAR(255),
  city           VARCHAR(100),
  notes          TEXT,
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  deleted_at     DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_customers_name ON customers(customer_name);
CREATE INDEX idx_customers_status ON customers(status);

CREATE TABLE customer_contacts (
  contact_id   INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT NOT NULL,
  name         VARCHAR(100) NOT NULL,
  position     VARCHAR(50),
  phone        VARCHAR(20),
  email        VARCHAR(100),
  CONSTRAINT fk_contacts_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- PROJECTS
-- =====================================================================

CREATE TABLE project_types (
  project_type_id  INT AUTO_INCREMENT PRIMARY KEY,
  type_name        VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE projects (
  project_id       INT AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT NOT NULL,
  project_type_id  INT NOT NULL,
  project_name     VARCHAR(150) NOT NULL,
  description      TEXT,
  project_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date       DATE,
  expected_finish  DATE,
  completed_date   DATE,
  status           ENUM('Pending','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  created_by       INT NOT NULL,
  deleted_at       DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_projects_type FOREIGN KEY (project_type_id) REFERENCES project_types(project_type_id),
  CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE contracts (
  contract_id       INT AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT NOT NULL,
  project_id        INT,
  contract_number   VARCHAR(50) NOT NULL UNIQUE,
  contract_date     DATE NOT NULL,
  start_date        DATE,
  end_date          DATE,
  contract_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  remarks           TEXT,
  signed_file_name  VARCHAR(255),
  signed_file_path  VARCHAR(500),
  status            ENUM('active','completed','terminated') NOT NULL DEFAULT 'active',
  created_by        INT NOT NULL,
  deleted_at        DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_contracts_project FOREIGN KEY (project_id) REFERENCES projects(project_id),
  CONSTRAINT fk_contracts_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_contracts_project ON contracts(project_id);
CREATE INDEX idx_contracts_status ON contracts(status);

CREATE TABLE rental_billings (
  billing_id         INT AUTO_INCREMENT PRIMARY KEY,
  project_id         INT NOT NULL,
  monthly_amount     DECIMAL(10,2) NOT NULL,
  billing_day        TINYINT NOT NULL DEFAULT 1,
  next_billing_date  DATE,
  last_generated     DATE,
  status             ENUM('Active','Paused','Expired') NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_rentalbilling_project FOREIGN KEY (project_id) REFERENCES projects(project_id)
) ENGINE=InnoDB;

CREATE INDEX idx_rental_next_date ON rental_billings(next_billing_date);

-- =====================================================================
-- INVOICES
-- =====================================================================

CREATE TABLE invoices (
  invoice_id      INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(30) NOT NULL UNIQUE,
  customer_id     INT NOT NULL,
  project_id      INT,
  contract_id     INT,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax             DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          ENUM('Draft','Issued','Partial','Paid','Cancelled','Overdue') NOT NULL DEFAULT 'Draft',
  created_by      INT NOT NULL,
  deleted_at      DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_invoices_project FOREIGN KEY (project_id) REFERENCES projects(project_id),
  CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts(contract_id),
  CONSTRAINT fk_invoices_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due ON invoices(due_date);

CREATE TABLE invoice_items (
  item_id      INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT NOT NULL,
  description  VARCHAR(255) NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  total        DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE invoice_attachments (
  attachment_id  INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id     INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  file_type      VARCHAR(50),
  uploaded_by    INT NOT NULL,
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoiceattach_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  CONSTRAINT fk_invoiceattach_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- =====================================================================
-- PAYMENTS
-- =====================================================================

CREATE TABLE payments (
  payment_id        INT AUTO_INCREMENT PRIMARY KEY,
  payment_number    VARCHAR(30) NOT NULL UNIQUE,
  customer_id       INT NOT NULL,
  payment_date      DATE NOT NULL,
  payment_method    ENUM('Cash','Bank','EVC Plus','eDahab','Premier Wallet','Other') NOT NULL DEFAULT 'Cash',
  reference_number  VARCHAR(100),
  amount            DECIMAL(12,2) NOT NULL,
  notes             TEXT,
  received_by       INT NOT NULL,
  deleted_at        DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_payments_receiver FOREIGN KEY (received_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE TABLE payment_allocations (
  allocation_id     INT AUTO_INCREMENT PRIMARY KEY,
  payment_id        INT NOT NULL,
  invoice_id        INT NOT NULL,
  amount_allocated  DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  CONSTRAINT fk_alloc_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
) ENGINE=InnoDB;

CREATE INDEX idx_alloc_invoice ON payment_allocations(invoice_id);

CREATE TABLE payment_attachments (
  attachment_id  INT AUTO_INCREMENT PRIMARY KEY,
  payment_id     INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  file_type      VARCHAR(50),
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_paymentattach_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MEMBER CONTRIBUTIONS (dues)
-- =====================================================================

CREATE TABLE member_due_batches (
  batch_id        INT AUTO_INCREMENT PRIMARY KEY,
  month           TINYINT NOT NULL,
  year            SMALLINT NOT NULL,
  default_amount  DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  generated_date  DATE NOT NULL,
  generated_by    INT NOT NULL,
  UNIQUE KEY uq_batch_month_year (month, year),
  CONSTRAINT fk_batch_generator FOREIGN KEY (generated_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE member_dues (
  due_id       INT AUTO_INCREMENT PRIMARY KEY,
  batch_id     INT NOT NULL,
  member_id    INT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  paid_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  status       ENUM('Pending','Partial','Paid') NOT NULL DEFAULT 'Pending',
  paid_date    DATE NULL,
  UNIQUE KEY uq_due_batch_member (batch_id, member_id),
  CONSTRAINT fk_dues_batch FOREIGN KEY (batch_id) REFERENCES member_due_batches(batch_id) ON DELETE CASCADE,
  CONSTRAINT fk_dues_member FOREIGN KEY (member_id) REFERENCES members(member_id)
) ENGINE=InnoDB;

CREATE INDEX idx_dues_batch ON member_dues(batch_id);
CREATE INDEX idx_dues_status ON member_dues(status);

-- =====================================================================
-- FINANCE — INCOME
-- =====================================================================

CREATE TABLE income_categories (
  income_category_id  INT AUTO_INCREMENT PRIMARY KEY,
  category_name        VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE other_income (
  income_id            INT AUTO_INCREMENT PRIMARY KEY,
  income_category_id   INT NOT NULL,
  description          VARCHAR(255),
  amount               DECIMAL(12,2) NOT NULL,
  income_date          DATE NOT NULL,
  received_by          INT NOT NULL,
  notes                TEXT,
  deleted_at           DATETIME NULL,
  CONSTRAINT fk_otherincome_category FOREIGN KEY (income_category_id) REFERENCES income_categories(income_category_id),
  CONSTRAINT fk_otherincome_user FOREIGN KEY (received_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_otherincome_date ON other_income(income_date);

-- =====================================================================
-- FINANCE — EXPENSES
-- =====================================================================

CREATE TABLE expense_categories (
  expense_category_id  INT AUTO_INCREMENT PRIMARY KEY,
  category_name        VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE expenses (
  expense_id           INT AUTO_INCREMENT PRIMARY KEY,
  expense_category_id  INT NOT NULL,
  expense_date         DATE NOT NULL,
  description          VARCHAR(255),
  amount               DECIMAL(12,2) NOT NULL,
  paid_by              VARCHAR(100),
  payment_method       ENUM('Cash','Bank','EVC Plus','eDahab','Premier Wallet','Other') NOT NULL DEFAULT 'Cash',
  reference_number     VARCHAR(100),
  notes                TEXT,
  created_by           INT NOT NULL,
  deleted_at           DATETIME NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_category FOREIGN KEY (expense_category_id) REFERENCES expense_categories(expense_category_id),
  CONSTRAINT fk_expenses_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(expense_category_id);

CREATE TABLE expense_attachments (
  attachment_id  INT AUTO_INCREMENT PRIMARY KEY,
  expense_id     INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  file_type      VARCHAR(50),
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenseattach_expense FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- ACCOUNTING LEDGER (append-only)
-- =====================================================================

CREATE TABLE transactions (
  transaction_id    INT AUTO_INCREMENT PRIMARY KEY,
  transaction_date  DATE NOT NULL,
  transaction_type  ENUM('Income','Expense') NOT NULL,
  reference_type    VARCHAR(50) NOT NULL,
  reference_id      INT NOT NULL,
  description       VARCHAR(255),
  income            DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense           DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after     DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by        INT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);

-- =====================================================================
-- SYSTEM
-- =====================================================================

CREATE TABLE settings (
  setting_id           INT AUTO_INCREMENT PRIMARY KEY,
  company_name         VARCHAR(150) NOT NULL,
  company_phone        VARCHAR(20),
  company_email        VARCHAR(100),
  company_address      VARCHAR(255),
  logo                 VARCHAR(500),
  currency             VARCHAR(10) NOT NULL DEFAULT '$',
  default_member_due   DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  invoice_prefix       VARCHAR(10) NOT NULL DEFAULT 'INV-',
  payment_prefix       VARCHAR(10) NOT NULL DEFAULT 'PAY-',
  contract_prefix      VARCHAR(10) NOT NULL DEFAULT 'CTR-',
  timezone             VARCHAR(50) NOT NULL DEFAULT 'Africa/Mogadishu',
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  log_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  module       VARCHAR(50) NOT NULL,
  action       VARCHAR(50) NOT NULL,
  record_id    INT,
  ip_address   VARCHAR(45),
  device       VARCHAR(255),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_module ON audit_logs(module, action);
