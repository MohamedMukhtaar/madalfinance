-- ============================================================
-- MADAL FINANCE — APPLICATION SUPPORT
-- Run after schema.sql (Stage 1 tables).
--
-- Extra tables and columns the API needs that are not part of
-- the business schema: auth tokens, settings, attachments,
-- trash, export jobs, and a few UI columns.
-- PostgreSQL 14+
-- ============================================================

-- ------------------------------------------------------------
-- AUTH — refresh tokens
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id     BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash   CHAR(64)     NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    ip_address   VARCHAR(45),
    device       VARCHAR(255),
    is_revoked   BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

-- ------------------------------------------------------------
-- USERS — soft delete (trash)
-- ------------------------------------------------------------

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS deleted_by    BIGINT REFERENCES users(user_id);

CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

-- ------------------------------------------------------------
-- MEMBERS — avatars + soft delete
-- ------------------------------------------------------------

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS avatar_path   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS avatar_name   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS deleted_by    BIGINT REFERENCES users(user_id);

CREATE INDEX IF NOT EXISTS idx_members_deleted ON members(deleted_at);

-- ------------------------------------------------------------
-- ACCOUNTS — default cash book
-- ------------------------------------------------------------

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_single_default
    ON accounts(is_default) WHERE is_default;

-- ------------------------------------------------------------
-- PROJECTS — logo / completion attachment
-- ------------------------------------------------------------

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS logo_path            VARCHAR(500),
    ADD COLUMN IF NOT EXISTS logo_file_name       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_path      VARCHAR(500),
    ADD COLUMN IF NOT EXISTS attachment_file_name VARCHAR(255);

-- ------------------------------------------------------------
-- CONTRACTS — signed PDF
-- ------------------------------------------------------------

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS signed_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS signed_file_path VARCHAR(500);

-- ------------------------------------------------------------
-- RENTAL BILLINGS — setup fee + status (UI uses Active/Paused/Expired)
-- ------------------------------------------------------------

ALTER TABLE rental_billings
    ADD COLUMN IF NOT EXISTS setup_fee        NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (setup_fee >= 0),
    ADD COLUMN IF NOT EXISTS setup_invoice_id BIGINT REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status           VARCHAR(20) NOT NULL DEFAULT 'Active';

ALTER TABLE rental_billings
    DROP CONSTRAINT IF EXISTS ck_rental_status;

ALTER TABLE rental_billings
    ADD CONSTRAINT ck_rental_status
        CHECK (status IN ('Active', 'Paused', 'Expired'));

-- ------------------------------------------------------------
-- AUDIT LOGS — optional details
-- ------------------------------------------------------------

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS details VARCHAR(500);

-- ------------------------------------------------------------
-- ATTACHMENTS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoice_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    invoice_id    BIGINT       NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_type     VARCHAR(50),
    uploaded_by   BIGINT       NOT NULL REFERENCES users(user_id),
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    payment_id    BIGINT       NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_type     VARCHAR(50),
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_charge_attachments (
    attachment_id     BIGSERIAL PRIMARY KEY,
    expense_charge_id BIGINT       NOT NULL REFERENCES expense_charges(expense_charge_id) ON DELETE CASCADE,
    file_name         VARCHAR(255) NOT NULL,
    file_path         VARCHAR(500) NOT NULL,
    file_type         VARCHAR(50),
    uploaded_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_due_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    due_id        BIGINT       NOT NULL REFERENCES member_dues(due_id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    file_path     VARCHAR(255) NOT NULL,
    file_type     VARCHAR(100),
    uploaded_by   BIGINT REFERENCES users(user_id),
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_due_attachments_due ON member_due_attachments(due_id);

ALTER TABLE expense_payments
    ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS deleted_by    BIGINT REFERENCES users(user_id);

-- ------------------------------------------------------------
-- OTHER INCOME (optional module still used by the API)
-- Category is a label on the row — no lookup table.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS other_income (
    income_id          BIGSERIAL PRIMARY KEY,
    category_name      VARCHAR(50)   NOT NULL DEFAULT 'Other',
    description        VARCHAR(255),
    amount             NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    income_date        DATE          NOT NULL,
    account_id         BIGINT REFERENCES accounts(account_id),
    received_by        BIGINT        NOT NULL REFERENCES users(user_id),
    notes              TEXT,
    deleted_at         TIMESTAMPTZ,
    delete_reason      VARCHAR(500),
    deleted_by         BIGINT REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_otherincome_date ON other_income(income_date);
CREATE INDEX IF NOT EXISTS idx_otherincome_account ON other_income(account_id);

-- ------------------------------------------------------------
-- SETTINGS (single row)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
    setting_id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (setting_id = 1),
    company_name       VARCHAR(150)  NOT NULL,
    company_phone      VARCHAR(30),
    company_email      VARCHAR(150),
    company_address    VARCHAR(255),
    logo               VARCHAR(500),
    currency           VARCHAR(10)   NOT NULL DEFAULT '$',
    default_member_due NUMERIC(14,2) NOT NULL DEFAULT 10.00,
    invoice_prefix     VARCHAR(10)   NOT NULL DEFAULT 'INV-',
    payment_prefix     VARCHAR(10)   NOT NULL DEFAULT 'PAY-',
    contract_prefix    VARCHAR(10)   NOT NULL DEFAULT 'CTR-',
    timezone           VARCHAR(50)   NOT NULL DEFAULT 'Africa/Mogadishu',
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

INSERT INTO settings (setting_id, company_name)
VALUES (1, 'Madal ICT Solutions')
ON CONFLICT (setting_id) DO NOTHING;

-- ------------------------------------------------------------
-- TRASH + EXPORT JOBS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trash_bin (
    trash_id      BIGSERIAL PRIMARY KEY,
    entity_type   VARCHAR(50)  NOT NULL,
    entity_id     BIGINT       NOT NULL,
    entity_label  VARCHAR(255) NOT NULL,
    delete_reason VARCHAR(500) NOT NULL,
    deleted_by    BIGINT REFERENCES users(user_id),
    deleted_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash_bin(deleted_at);
CREATE INDEX IF NOT EXISTS idx_trash_type       ON trash_bin(entity_type);

CREATE TABLE IF NOT EXISTS export_jobs (
    job_id        BIGSERIAL PRIMARY KEY,
    kind          VARCHAR(64)  NOT NULL,
    format        VARCHAR(8)   NOT NULL,
    params        JSONB,
    status        VARCHAR(12)  NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path     VARCHAR(512),
    error_message TEXT,
    created_by    BIGINT REFERENCES users(user_id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status, created_at);
