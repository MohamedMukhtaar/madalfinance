-- ============================================================
-- MADAL FINANCE / ICT SOLUTIONS
-- CLEAN POSTGRESQL FINANCE SCHEMA
-- TABLES ONLY
-- PostgreSQL 14+
--
-- Stage 1:
--   Tables
--   Constraints
--   Indexes
--
-- Stage 2:
--   Procedures
--   Functions
--   Statements
--   Reports
--   Triggers
--
-- Statement format:
-- Date | Time | Type | Reference | Debit | Credit | Loan | Balance
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RESET PUBLIC SCHEMA
-- ============================================================

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;
-- ============================================================
-- 1.5 SET SCHEMA SEARCH PATH
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

CREATE TYPE active_status AS ENUM (
    'active',
    'inactive'
);

CREATE TYPE payment_method_enum AS ENUM (
    'Cash',
    'Bank',
    'EVC Plus',
    'eDahab',
    'Premier Wallet',
    'Other'
);

CREATE TYPE project_status_enum AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled'
);

CREATE TYPE contract_status_enum AS ENUM (
    'Active',
    'Completed',
    'Terminated'
);

CREATE TYPE invoice_status_enum AS ENUM (
    'Draft',
    'Issued',
    'Partial',
    'Paid',
    'Cancelled',
    'Overdue'
);

CREATE TYPE due_status_enum AS ENUM (
    'Pending',
    'Partial',
    'Paid'
);

CREATE TYPE account_type_enum AS ENUM (
    'Cash',
    'Bank',
    'Mobile Money',
    'Other'
);

CREATE TYPE transaction_type_enum AS ENUM (
    'Income',
    'Expense',
    'Transfer',
    'Loan'
);

CREATE TYPE charge_status_enum AS ENUM (
    'Pending',
    'Partial',
    'Paid',
    'Cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
    'Pending',
    'Completed',
    'Cancelled'
);

-- ============================================================
-- 3. ROLES
-- ============================================================

CREATE TABLE roles (
    role_id       BIGSERIAL PRIMARY KEY,

    role_name     VARCHAR(50) NOT NULL UNIQUE,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. USERS
-- ============================================================

CREATE TABLE users (
    user_id       BIGSERIAL PRIMARY KEY,

    role_id       BIGINT NOT NULL
        REFERENCES roles(role_id),

    username      VARCHAR(50) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    full_name     VARCHAR(150) NOT NULL,

    phone         VARCHAR(30),

    email         VARCHAR(150),

    status        active_status NOT NULL DEFAULT 'active',

    last_login    TIMESTAMPTZ,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. ACCOUNTS
--
-- IMPORTANT:
-- Created BEFORE any table that references account_id.
-- ============================================================

CREATE TABLE accounts (
    account_id        BIGSERIAL PRIMARY KEY,

    account_name      VARCHAR(100) NOT NULL UNIQUE,

    account_type      account_type_enum NOT NULL,

    account_number    VARCHAR(100),

    opening_balance   NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (opening_balance >= 0),

    balance           NUMERIC(14,2) NOT NULL DEFAULT 0,

    status            active_status NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. MEMBERS
--
-- No user_id.
-- Members are independent business/member records.
-- ============================================================

CREATE TABLE members (
    member_id            BIGSERIAL PRIMARY KEY,

    member_code          VARCHAR(30) NOT NULL UNIQUE,

    full_name             VARCHAR(150) NOT NULL,

    phone                 VARCHAR(30),

    email                 VARCHAR(150),

    address               VARCHAR(255),

    joined_date           DATE NOT NULL,

    position              VARCHAR(100),

    ownership_percentage  NUMERIC(5,2)
        CHECK (
            ownership_percentage >= 0
            AND ownership_percentage <= 100
        ),

    default_monthly_due   NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (default_monthly_due >= 0),

    credit_balance        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (credit_balance >= 0),

    status                active_status NOT NULL DEFAULT 'active',

    notes                 TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. MEMBER DUE BATCHES
--
-- Groups monthly member dues.
--
-- Example:
-- September 2026
-- October 2026
-- etc.
-- ============================================================

CREATE TABLE member_due_batches (
    batch_id          BIGSERIAL PRIMARY KEY,

    month             SMALLINT NOT NULL
        CHECK (month BETWEEN 1 AND 12),

    year              SMALLINT NOT NULL
        CHECK (year >= 2000),

    default_amount    NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (default_amount >= 0),

    generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    generated_by      BIGINT NOT NULL
        REFERENCES users(user_id),

    UNIQUE (month, year)
);

-- ============================================================
-- 8. MEMBER DUES
--
-- Actual amount owed by each member.
-- ============================================================

CREATE TABLE member_dues (
    due_id             BIGSERIAL PRIMARY KEY,

    batch_id           BIGINT NOT NULL
        REFERENCES member_due_batches(batch_id)
        ON DELETE CASCADE,

    member_id          BIGINT NOT NULL
        REFERENCES members(member_id),

    amount             NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    paid_amount        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (paid_amount >= 0),

    balance            NUMERIC(14,2)
        GENERATED ALWAYS AS
        (amount - paid_amount) STORED,

    status             due_status_enum NOT NULL DEFAULT 'Pending',

    paid_at            TIMESTAMPTZ,

    UNIQUE (batch_id, member_id),

    CHECK (paid_amount <= amount)
);

-- ============================================================
-- 9. MEMBER DUE PAYMENTS
-- ============================================================

CREATE TABLE member_due_payments (
    payment_id        BIGSERIAL PRIMARY KEY,

    due_id            BIGINT NOT NULL
        REFERENCES member_dues(due_id),

    member_id         BIGINT NOT NULL
        REFERENCES members(member_id),

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    payment_method    payment_method_enum NOT NULL DEFAULT 'Cash',

    reference_number  VARCHAR(100),

    paid_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    received_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    status            payment_status_enum NOT NULL DEFAULT 'Completed',

    notes             TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. MEMBER LOANS
--
-- Money given/loaned to a member.
-- ============================================================

CREATE TABLE member_loans (
    loan_id           BIGSERIAL PRIMARY KEY,

    member_id         BIGINT NOT NULL
        REFERENCES members(member_id),

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    loan_number       VARCHAR(50) NOT NULL UNIQUE,

    loan_date         TIMESTAMPTZ NOT NULL DEFAULT now(),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (paid_amount >= 0),

    balance           NUMERIC(14,2)
        GENERATED ALWAYS AS
        (amount - paid_amount) STORED,

    description       VARCHAR(255),

    reference_number  VARCHAR(100),

    status            charge_status_enum NOT NULL DEFAULT 'Pending',

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (paid_amount <= amount)
);

-- ============================================================
-- 11. MEMBER LOAN PAYMENTS
--
-- Money returned by member against a loan.
-- ============================================================

CREATE TABLE member_loan_payments (
    loan_payment_id   BIGSERIAL PRIMARY KEY,

    loan_id           BIGINT NOT NULL
        REFERENCES member_loans(loan_id),

    member_id         BIGINT NOT NULL
        REFERENCES members(member_id),

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    payment_method    payment_method_enum NOT NULL DEFAULT 'Cash',

    reference_number  VARCHAR(100),

    paid_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    received_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    status            payment_status_enum NOT NULL DEFAULT 'Completed',

    notes             TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    customer_id     BIGSERIAL PRIMARY KEY,

    customer_code   VARCHAR(30) NOT NULL UNIQUE,

    customer_name   VARCHAR(150) NOT NULL,

    company_name    VARCHAR(150),

    phone           VARCHAR(30),

    email           VARCHAR(150),

    address         VARCHAR(255),

    city            VARCHAR(100),

    notes           TEXT,

    status          active_status NOT NULL DEFAULT 'active',

    deleted_at      TIMESTAMPTZ,

    deleted_by      BIGINT
        REFERENCES users(user_id),

    delete_reason   TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. CUSTOMER CONTACTS
-- ============================================================

CREATE TABLE customer_contacts (
    contact_id      BIGSERIAL PRIMARY KEY,

    customer_id     BIGINT NOT NULL
        REFERENCES customers(customer_id)
        ON DELETE CASCADE,

    name            VARCHAR(150) NOT NULL,

    position        VARCHAR(100),

    phone           VARCHAR(30),

    email           VARCHAR(150),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. PROJECT TYPES
-- ============================================================

CREATE TABLE project_types (
    project_type_id BIGSERIAL PRIMARY KEY,

    type_name       VARCHAR(100) NOT NULL UNIQUE,

    description     TEXT,

    status          active_status NOT NULL DEFAULT 'active',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14b. PROJECT TEMPLATES (registered offerings)
--
-- Register a sellable project once (name, type, price / rent).
-- Customer projects are assignments of a template to a customer.
-- ============================================================

CREATE TABLE project_templates (
    template_id      BIGSERIAL PRIMARY KEY,

    template_name    VARCHAR(200) NOT NULL UNIQUE,

    project_type_id  BIGINT NOT NULL
        REFERENCES project_types(project_type_id),

    description      TEXT,

    project_price    NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (project_price >= 0),

    monthly_amount   NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (monthly_amount >= 0),

    setup_fee        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (setup_fee >= 0),

    billing_day      SMALLINT NOT NULL DEFAULT 1
        CHECK (billing_day BETWEEN 1 AND 28),

    logo_path        VARCHAR(500),

    logo_file_name   VARCHAR(255),

    status           active_status NOT NULL DEFAULT 'active',

    created_by       BIGINT
        REFERENCES users(user_id),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. PROJECTS
--
-- Project does NOT directly contain customer_id.
-- Customer relationship is handled by project_customers.
-- Each row is one customer assignment of a registered project.
-- ============================================================

CREATE TABLE projects (
    project_id       BIGSERIAL PRIMARY KEY,

    project_code     VARCHAR(30) NOT NULL UNIQUE,

    template_id      BIGINT
        REFERENCES project_templates(template_id),

    project_type_id  BIGINT NOT NULL
        REFERENCES project_types(project_type_id),

    project_name     VARCHAR(200) NOT NULL,

    description      TEXT,

    project_price    NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (project_price >= 0),

    discount         NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),

    start_date       DATE,

    expected_finish  DATE,

    completed_date   DATE,

    status           project_status_enum NOT NULL DEFAULT 'Pending',

    deleted_at       TIMESTAMPTZ,

    deleted_by       BIGINT
        REFERENCES users(user_id),

    delete_reason    TEXT,

    created_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        expected_finish IS NULL
        OR start_date IS NULL
        OR expected_finish >= start_date
    ),

    CHECK (
        completed_date IS NULL
        OR start_date IS NULL
        OR completed_date >= start_date
    )
);

-- ============================================================
-- 16. PROJECT CUSTOMERS
-- ============================================================

CREATE TABLE project_customers (
    project_customer_id BIGSERIAL PRIMARY KEY,

    project_id BIGINT NOT NULL
        REFERENCES projects(project_id)
        ON DELETE CASCADE,

    customer_id BIGINT NOT NULL
        REFERENCES customers(customer_id),

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (project_id, customer_id)
);

CREATE UNIQUE INDEX uq_project_primary_customer
ON project_customers(project_id)
WHERE is_primary = TRUE;

-- ============================================================
-- 17. CONTRACTS
-- ============================================================

CREATE TABLE contracts (
    contract_id       BIGSERIAL PRIMARY KEY,

    contract_number   VARCHAR(50) NOT NULL UNIQUE,

    customer_id       BIGINT NOT NULL
        REFERENCES customers(customer_id),

    project_id        BIGINT
        REFERENCES projects(project_id),

    contract_date     DATE NOT NULL,

    start_date        DATE,

    end_date          DATE,

    contract_amount   NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (contract_amount >= 0),

    document_path     VARCHAR(500),

    remarks           TEXT,

    status            contract_status_enum NOT NULL DEFAULT 'Active',

    deleted_at        TIMESTAMPTZ,

    deleted_by        BIGINT
        REFERENCES users(user_id),

    delete_reason     TEXT,

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        end_date IS NULL
        OR start_date IS NULL
        OR end_date >= start_date
    )
);

-- ============================================================
-- 18. RENTAL BILLINGS
-- ============================================================

CREATE TABLE rental_billings (
    billing_id         BIGSERIAL PRIMARY KEY,

    project_id         BIGINT NOT NULL UNIQUE
        REFERENCES projects(project_id)
        ON DELETE CASCADE,

    monthly_amount     NUMERIC(14,2) NOT NULL
        CHECK (monthly_amount > 0),

    billing_day        SMALLINT NOT NULL DEFAULT 1
        CHECK (billing_day BETWEEN 1 AND 28),

    next_billing_date  DATE,

    last_generated     DATE,

    active             BOOLEAN NOT NULL DEFAULT TRUE,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. INVOICES
--
-- No contract_id.
-- ============================================================

CREATE TABLE invoices (
    invoice_id       BIGSERIAL PRIMARY KEY,

    invoice_number   VARCHAR(50) NOT NULL UNIQUE,

    customer_id      BIGINT NOT NULL
        REFERENCES customers(customer_id),

    project_id       BIGINT
        REFERENCES projects(project_id),

    invoice_date     DATE NOT NULL,

    due_date         DATE,

    subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (subtotal >= 0),

    discount         NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),

    tax              NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (tax >= 0),

    total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (total_amount >= 0),

    paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (paid_amount >= 0),

    balance          NUMERIC(14,2)
        GENERATED ALWAYS AS
        (total_amount - paid_amount) STORED,

    status           invoice_status_enum NOT NULL DEFAULT 'Draft',

    notes            TEXT,

    deleted_at       TIMESTAMPTZ,

    deleted_by       BIGINT
        REFERENCES users(user_id),

    delete_reason    TEXT,

    created_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (paid_amount <= total_amount),

    CHECK (
        due_date IS NULL
        OR due_date >= invoice_date
    )
);

-- ============================================================
-- 20. INVOICE ITEMS
-- ============================================================

CREATE TABLE invoice_items (
    item_id       BIGSERIAL PRIMARY KEY,

    invoice_id    BIGINT NOT NULL
        REFERENCES invoices(invoice_id)
        ON DELETE CASCADE,

    description   VARCHAR(255) NOT NULL,

    quantity      NUMERIC(12,2) NOT NULL DEFAULT 1
        CHECK (quantity > 0),

    unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (unit_price >= 0),

    total         NUMERIC(14,2)
        GENERATED ALWAYS AS
        (quantity * unit_price) STORED
);

-- ============================================================
-- 21. CUSTOMER PAYMENTS
-- ============================================================

CREATE TABLE payments (
    payment_id        BIGSERIAL PRIMARY KEY,

    payment_number    VARCHAR(50) NOT NULL UNIQUE,

    customer_id       BIGINT NOT NULL
        REFERENCES customers(customer_id),

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    payment_date      TIMESTAMPTZ NOT NULL DEFAULT now(),

    payment_method    payment_method_enum NOT NULL DEFAULT 'Cash',

    reference_number  VARCHAR(100),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    notes             TEXT,

    deleted_at        TIMESTAMPTZ,

    deleted_by        BIGINT
        REFERENCES users(user_id),

    delete_reason     TEXT,

    received_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    status            payment_status_enum NOT NULL DEFAULT 'Completed',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 22. PAYMENT ALLOCATIONS
--
-- Allows one payment to pay multiple invoices.
-- ============================================================

CREATE TABLE payment_allocations (
    allocation_id     BIGSERIAL PRIMARY KEY,

    payment_id        BIGINT NOT NULL
        REFERENCES payments(payment_id)
        ON DELETE CASCADE,

    invoice_id        BIGINT NOT NULL
        REFERENCES invoices(invoice_id),

    amount_allocated  NUMERIC(14,2) NOT NULL
        CHECK (amount_allocated > 0),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (payment_id, invoice_id)
);

-- ============================================================
-- 23. EXPENSE MASTER
-- ============================================================

CREATE TABLE expenses (
    expense_id      BIGSERIAL PRIMARY KEY,

    expense_code    VARCHAR(30) NOT NULL UNIQUE,

    expense_name    VARCHAR(100) NOT NULL UNIQUE,

    description     TEXT,

    status          active_status NOT NULL DEFAULT 'active',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 24. EXPENSE CHARGES
--
-- Represents an expense incurred/charged.
-- ============================================================

CREATE TABLE expense_charges (
    expense_charge_id BIGSERIAL PRIMARY KEY,

    charge_number     VARCHAR(50) NOT NULL UNIQUE,

    expense_id        BIGINT NOT NULL
        REFERENCES expenses(expense_id),

    charge_date       TIMESTAMPTZ NOT NULL DEFAULT now(),

    description       VARCHAR(255),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (paid_amount >= 0),

    balance           NUMERIC(14,2)
        GENERATED ALWAYS AS
        (amount - paid_amount) STORED,

    status            charge_status_enum NOT NULL DEFAULT 'Pending',

    reference_number  VARCHAR(100),

    charged_to        VARCHAR(150),

    notes             TEXT,

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (paid_amount <= amount)
);

-- ============================================================
-- 25. EXPENSE PAYMENTS
-- ============================================================

CREATE TABLE expense_payments (
    expense_payment_id BIGSERIAL PRIMARY KEY,

    payment_number     VARCHAR(50) NOT NULL UNIQUE,

    expense_charge_id  BIGINT NOT NULL
        REFERENCES expense_charges(expense_charge_id),

    account_id         BIGINT NOT NULL
        REFERENCES accounts(account_id),

    payment_date       TIMESTAMPTZ NOT NULL DEFAULT now(),

    amount             NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    payment_method     payment_method_enum NOT NULL DEFAULT 'Cash',

    reference_number   VARCHAR(100),

    paid_to            VARCHAR(150),

    notes              TEXT,

    paid_by            BIGINT NOT NULL
        REFERENCES users(user_id),

    status             payment_status_enum NOT NULL DEFAULT 'Completed',

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 26. EMPLOYEE ORGANIZATION
-- ============================================================

CREATE TABLE departments (
    department_id     BIGSERIAL PRIMARY KEY,

    department_name   VARCHAR(100) NOT NULL UNIQUE,

    notes             TEXT,

    status            active_status NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_titles (
    job_title_id      BIGSERIAL PRIMARY KEY,

    title_name        VARCHAR(100) NOT NULL UNIQUE,

    notes             TEXT,

    status            active_status NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
    branch_id         BIGSERIAL PRIMARY KEY,

    branch_name       VARCHAR(100) NOT NULL UNIQUE,

    notes             TEXT,

    status            active_status NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shifts (
    shift_id          BIGSERIAL PRIMARY KEY,

    shift_name        VARCHAR(100) NOT NULL UNIQUE,

    start_time        TIME,

    end_time          TIME,

    notes             TEXT,

    status            active_status NOT NULL DEFAULT 'active',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 27. EMPLOYEES
--
-- Employee registration only.
-- ============================================================

CREATE TABLE employees (
    employee_id       BIGSERIAL PRIMARY KEY,

    employee_code     VARCHAR(30) NOT NULL UNIQUE,

    first_name        VARCHAR(100) NOT NULL,

    last_name         VARCHAR(100),

    gender            VARCHAR(20),

    phone             VARCHAR(30),

    email             VARCHAR(150),

    address           VARCHAR(255),

    job_title         VARCHAR(100),

    department        VARCHAR(100),

    job_title_id      BIGINT
        REFERENCES job_titles(job_title_id),

    department_id     BIGINT
        REFERENCES departments(department_id),

    branch_id         BIGINT
        REFERENCES branches(branch_id),

    shift_id          BIGINT
        REFERENCES shifts(shift_id),

    hire_date         DATE NOT NULL,

    basic_salary      NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (basic_salary >= 0),

    status            active_status NOT NULL DEFAULT 'active',

    notes             TEXT,

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS job_title_id BIGINT
        REFERENCES job_titles(job_title_id);

-- ============================================================
-- 28. SALARY CHARGES
-- ============================================================

CREATE TABLE salary_charges (
    salary_charge_id BIGSERIAL PRIMARY KEY,

    charge_number    VARCHAR(50) NOT NULL UNIQUE,

    employee_id      BIGINT NOT NULL
        REFERENCES employees(employee_id),

    charge_date      TIMESTAMPTZ NOT NULL DEFAULT now(),

    salary_period    DATE NOT NULL,

    basic_salary     NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (basic_salary >= 0),

    allowance        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (allowance >= 0),

    deduction        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (deduction >= 0),

    net_salary       NUMERIC(14,2)
        GENERATED ALWAYS AS
        (basic_salary + allowance - deduction) STORED,

    paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (paid_amount >= 0),

    balance          NUMERIC(14,2)
        GENERATED ALWAYS AS
        (
            (basic_salary + allowance - deduction)
            - paid_amount
        ) STORED,

    status           charge_status_enum NOT NULL DEFAULT 'Pending',

    reference_number VARCHAR(100),

    notes            TEXT,

    created_by       BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        deduction <= basic_salary + allowance
    ),

    CHECK (
        paid_amount <=
        (basic_salary + allowance - deduction)
    ),

    UNIQUE (employee_id, salary_period)
);

-- ============================================================
-- 29. SALARY PAYMENTS
-- ============================================================

CREATE TABLE salary_payments (
    salary_payment_id BIGSERIAL PRIMARY KEY,

    payment_number    VARCHAR(50) NOT NULL UNIQUE,

    salary_charge_id  BIGINT NOT NULL
        REFERENCES salary_charges(salary_charge_id),

    employee_id       BIGINT NOT NULL
        REFERENCES employees(employee_id),

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    payment_date      TIMESTAMPTZ NOT NULL DEFAULT now(),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    payment_method    payment_method_enum NOT NULL DEFAULT 'Cash',

    reference_number  VARCHAR(100),

    notes             TEXT,

    paid_by           BIGINT NOT NULL
        REFERENCES users(user_id),

    status            payment_status_enum NOT NULL DEFAULT 'Completed',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 29. ACCOUNT TRANSFERS
--
-- Example:
-- Cash -> Bank = $500
-- ============================================================

CREATE TABLE account_transfers (
    transfer_id       BIGSERIAL PRIMARY KEY,

    transfer_number   VARCHAR(50) NOT NULL UNIQUE,

    from_account_id   BIGINT NOT NULL
        REFERENCES accounts(account_id),

    to_account_id     BIGINT NOT NULL
        REFERENCES accounts(account_id),

    amount            NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    transfer_date     TIMESTAMPTZ NOT NULL DEFAULT now(),

    reference_number  VARCHAR(100),

    notes             TEXT,

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (from_account_id <> to_account_id)
);

-- ============================================================
-- 30. GENERAL ACCOUNT TRANSACTIONS
--
-- Financial transaction spine.
--
-- Statement format:
--
-- Date | Time | Type | Reference | Debit | Credit | Loan | Balance
--
-- Exactly ONE of:
--   debit
--   credit
--   loan
-- must contain a value greater than zero.
-- ============================================================

CREATE TABLE transactions (
    transaction_id    BIGSERIAL PRIMARY KEY,

    transaction_date  TIMESTAMPTZ NOT NULL DEFAULT now(),

    transaction_type  transaction_type_enum NOT NULL,

    account_id        BIGINT NOT NULL
        REFERENCES accounts(account_id),

    reference_type    VARCHAR(50) NOT NULL,

    reference_id      BIGINT,

    description       VARCHAR(255),

    debit             NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (debit >= 0),

    credit            NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (credit >= 0),

    loan              NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (loan >= 0),

    created_by        BIGINT NOT NULL
        REFERENCES users(user_id),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (
            debit > 0
            AND credit = 0
            AND loan = 0
        )
        OR
        (
            credit > 0
            AND debit = 0
            AND loan = 0
        )
        OR
        (
            loan > 0
            AND debit = 0
            AND credit = 0
        )
    )
);

-- ============================================================
-- 31. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    log_id        BIGSERIAL PRIMARY KEY,

    user_id       BIGINT
        REFERENCES users(user_id),

    module        VARCHAR(50) NOT NULL,

    action        VARCHAR(100) NOT NULL,

    record_id     BIGINT,

    ip_address    VARCHAR(45),

    device        VARCHAR(255),

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 32. INDEXES
-- ============================================================

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------

CREATE INDEX idx_users_role
ON users(role_id);

-- ------------------------------------------------------------
-- MEMBERS
-- ------------------------------------------------------------

CREATE INDEX idx_members_status
ON members(status);

CREATE INDEX idx_members_joined_date
ON members(joined_date);

CREATE INDEX idx_members_job_title_id
ON members(job_title_id);

-- ------------------------------------------------------------
-- MEMBER DUES
-- ------------------------------------------------------------

CREATE INDEX idx_member_dues_member
ON member_dues(member_id);

CREATE INDEX idx_member_dues_batch
ON member_dues(batch_id);

CREATE INDEX idx_member_dues_status
ON member_dues(status);

CREATE INDEX idx_member_due_payments_member
ON member_due_payments(member_id);

CREATE INDEX idx_member_due_payments_due
ON member_due_payments(due_id);

CREATE INDEX idx_member_due_payments_account
ON member_due_payments(account_id);

CREATE INDEX idx_member_due_payments_date
ON member_due_payments(paid_at);

-- ------------------------------------------------------------
-- MEMBER LOANS
-- ------------------------------------------------------------

CREATE INDEX idx_member_loans_member
ON member_loans(member_id);

CREATE INDEX idx_member_loans_account
ON member_loans(account_id);

CREATE INDEX idx_member_loans_date
ON member_loans(loan_date);

CREATE INDEX idx_member_loans_status
ON member_loans(status);

CREATE INDEX idx_member_loan_payments_member
ON member_loan_payments(member_id);

CREATE INDEX idx_member_loan_payments_loan
ON member_loan_payments(loan_id);

CREATE INDEX idx_member_loan_payments_account
ON member_loan_payments(account_id);

CREATE INDEX idx_member_loan_payments_date
ON member_loan_payments(paid_at);

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------

CREATE INDEX idx_customers_status
ON customers(status);

CREATE INDEX idx_customer_contacts_customer
ON customer_contacts(customer_id);

-- ------------------------------------------------------------
-- PROJECTS
-- ------------------------------------------------------------

CREATE INDEX idx_projects_type
ON projects(project_type_id);

CREATE INDEX idx_projects_status
ON projects(status);

CREATE INDEX idx_project_customers_project
ON project_customers(project_id);

CREATE INDEX idx_project_customers_customer
ON project_customers(customer_id);

-- ------------------------------------------------------------
-- CONTRACTS
-- ------------------------------------------------------------

CREATE INDEX idx_contracts_customer
ON contracts(customer_id);

CREATE INDEX idx_contracts_project
ON contracts(project_id);

CREATE INDEX idx_contracts_status
ON contracts(status);

-- ------------------------------------------------------------
-- RENTAL BILLINGS
-- ------------------------------------------------------------

CREATE INDEX idx_rental_billings_next_date
ON rental_billings(next_billing_date);

CREATE INDEX idx_rental_billings_active
ON rental_billings(active);

-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------

CREATE INDEX idx_invoices_customer
ON invoices(customer_id);

CREATE INDEX idx_invoices_project
ON invoices(project_id);

CREATE INDEX idx_invoices_date
ON invoices(invoice_date);

CREATE INDEX idx_invoices_due_date
ON invoices(due_date);

CREATE INDEX idx_invoices_status
ON invoices(status);

-- ------------------------------------------------------------
-- INVOICE ITEMS
-- ------------------------------------------------------------

CREATE INDEX idx_invoice_items_invoice
ON invoice_items(invoice_id);

-- ------------------------------------------------------------
-- CUSTOMER PAYMENTS
-- ------------------------------------------------------------

CREATE INDEX idx_payments_customer
ON payments(customer_id);

CREATE INDEX idx_payments_account
ON payments(account_id);

CREATE INDEX idx_payments_date
ON payments(payment_date);

CREATE INDEX idx_payments_status
ON payments(status);

-- ------------------------------------------------------------
-- PAYMENT ALLOCATIONS
-- ------------------------------------------------------------

CREATE INDEX idx_payment_allocations_payment
ON payment_allocations(payment_id);

CREATE INDEX idx_payment_allocations_invoice
ON payment_allocations(invoice_id);

-- ------------------------------------------------------------
-- EXPENSES
-- ------------------------------------------------------------

CREATE INDEX idx_expenses_status
ON expenses(status);

CREATE INDEX idx_expense_charges_expense
ON expense_charges(expense_id);

CREATE INDEX idx_expense_charges_date
ON expense_charges(charge_date);

CREATE INDEX idx_expense_charges_status
ON expense_charges(status);

CREATE INDEX idx_expense_payments_charge
ON expense_payments(expense_charge_id);

CREATE INDEX idx_expense_payments_account
ON expense_payments(account_id);

CREATE INDEX idx_expense_payments_date
ON expense_payments(payment_date);

CREATE INDEX idx_expense_payments_status
ON expense_payments(status);

-- ------------------------------------------------------------
-- EMPLOYEES
-- ------------------------------------------------------------

CREATE INDEX idx_employees_status
ON employees(status);

CREATE INDEX idx_employees_department
ON employees(department);

CREATE INDEX idx_employees_department_id
ON employees(department_id);

CREATE INDEX idx_employees_job_title_id
ON employees(job_title_id);

CREATE INDEX idx_employees_branch_id
ON employees(branch_id);

CREATE INDEX idx_employees_shift_id
ON employees(shift_id);

-- ------------------------------------------------------------
-- SALARY CHARGES
-- ------------------------------------------------------------

CREATE INDEX idx_salary_charges_employee
ON salary_charges(employee_id);

CREATE INDEX idx_salary_charges_period
ON salary_charges(salary_period);

CREATE INDEX idx_salary_charges_date
ON salary_charges(charge_date);

CREATE INDEX idx_salary_charges_status
ON salary_charges(status);

-- ------------------------------------------------------------
-- SALARY PAYMENTS
-- ------------------------------------------------------------

CREATE INDEX idx_salary_payments_employee
ON salary_payments(employee_id);

CREATE INDEX idx_salary_payments_charge
ON salary_payments(salary_charge_id);

CREATE INDEX idx_salary_payments_account
ON salary_payments(account_id);

CREATE INDEX idx_salary_payments_date
ON salary_payments(payment_date);

CREATE INDEX idx_salary_payments_status
ON salary_payments(status);

-- ------------------------------------------------------------
-- ACCOUNTS
-- ------------------------------------------------------------

CREATE INDEX idx_accounts_type
ON accounts(account_type);

CREATE INDEX idx_accounts_status
ON accounts(status);

-- ------------------------------------------------------------
-- ACCOUNT TRANSFERS
-- ------------------------------------------------------------

CREATE INDEX idx_account_transfers_from
ON account_transfers(from_account_id);

CREATE INDEX idx_account_transfers_to
ON account_transfers(to_account_id);

CREATE INDEX idx_account_transfers_date
ON account_transfers(transfer_date);

-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------

CREATE INDEX idx_transactions_account
ON transactions(account_id);

CREATE INDEX idx_transactions_date
ON transactions(transaction_date);

CREATE INDEX idx_transactions_type
ON transactions(transaction_type);

CREATE INDEX idx_transactions_reference
ON transactions(reference_type, reference_id);

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------

CREATE INDEX idx_audit_logs_user
ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_created_at
ON audit_logs(created_at);

CREATE INDEX idx_audit_logs_module_action
ON audit_logs(module, action);

-- ============================================================
-- 33. COMMIT
-- ============================================================

COMMIT;

-- Stage 2 (API / statements) lives alongside this file:
--   database/app_support.sql   auth, settings, attachments, trash
--   database/functions.sql     account/member/customer/project/expense statements
--   database/integrity.sql     updated_at + ledger triggers
--
-- Apply those after this schema, or run: cd backend && npm run db:init
