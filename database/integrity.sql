-- ============================================================
-- MADAL FINANCE — INTEGRITY TRIGGERS
-- Run after schema.sql + app_support.sql
-- PostgreSQL 14+
-- ============================================================

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_types_updated_at ON project_types;
CREATE TRIGGER trg_project_types_updated_at
  BEFORE UPDATE ON project_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rental_billings_updated_at ON rental_billings;
CREATE TRIGGER trg_rental_billings_updated_at
  BEFORE UPDATE ON rental_billings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_job_titles_updated_at ON job_titles;
CREATE TRIGGER trg_job_titles_updated_at
  BEFORE UPDATE ON job_titles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shifts_updated_at ON shifts;
CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep rental `active` boolean in sync with status.
CREATE OR REPLACE FUNCTION sync_rental_active() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.active := (NEW.status = 'Active');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rental_active ON rental_billings;
CREATE TRIGGER trg_rental_active
  BEFORE INSERT OR UPDATE ON rental_billings
  FOR EACH ROW EXECUTE FUNCTION sync_rental_active();

-- ---------------------------------------------------------------------
-- Invoice arithmetic: total = subtotal - discount + tax
-- ---------------------------------------------------------------------

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS ck_invoices_total_matches;
ALTER TABLE invoices
  ADD CONSTRAINT ck_invoices_total_matches
    CHECK (total_amount = subtotal - discount + tax);

-- ---------------------------------------------------------------------
-- Ledger: rows may only have date/description corrected
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ledger_append_only() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'transactions is append-only: ledger row % cannot be deleted. Post a reversing entry instead.',
      OLD.transaction_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.transaction_id   IS DISTINCT FROM OLD.transaction_id
     OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
     OR NEW.account_id       IS DISTINCT FROM OLD.account_id
     OR NEW.reference_type   IS DISTINCT FROM OLD.reference_type
     OR NEW.reference_id     IS DISTINCT FROM OLD.reference_id
     OR NEW.debit            IS DISTINCT FROM OLD.debit
     OR NEW.credit           IS DISTINCT FROM OLD.credit
     OR NEW.loan             IS DISTINCT FROM OLD.loan
     OR NEW.created_by       IS DISTINCT FROM OLD.created_by
     OR NEW.created_at       IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'transactions is append-only: ledger row % may only have transaction_date or description corrected.',
      OLD.transaction_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_append_only ON transactions;
CREATE TRIGGER trg_transactions_append_only
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();

-- ---------------------------------------------------------------------
-- Payment allocations cannot exceed the invoice they target
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION allocation_within_invoice() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_total   NUMERIC(14,2);
  invoice_number  VARCHAR(50);
  allocated_total NUMERIC(14,2);
BEGIN
  SELECT i.total_amount, i.invoice_number
    INTO invoice_total, invoice_number
    FROM invoices i
   WHERE i.invoice_id = NEW.invoice_id
     FOR UPDATE;

  SELECT COALESCE(SUM(a.amount_allocated), 0)
    INTO allocated_total
    FROM payment_allocations a
    JOIN payments p ON p.payment_id = a.payment_id
   WHERE a.invoice_id = NEW.invoice_id
     AND p.deleted_at IS NULL
     AND a.allocation_id IS DISTINCT FROM NEW.allocation_id;

  IF allocated_total + NEW.amount_allocated > invoice_total + 0.01 THEN
    RAISE EXCEPTION
      'Allocations for invoice % would total %, exceeding the invoice amount of %',
      invoice_number, allocated_total + NEW.amount_allocated, invoice_total
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocation_within_invoice ON payment_allocations;
CREATE TRIGGER trg_allocation_within_invoice
  BEFORE INSERT OR UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION allocation_within_invoice();
