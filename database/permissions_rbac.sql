-- ============================================================
-- Spatie-style RBAC on PostgreSQL + single-tenant organization
-- Safe to run on existing databases (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Permission rows themselves are seeded from the Node seeder so the catalog
-- lives in one place (backend/src/utils/permissions.js).
-- ============================================================

ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS description VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS guard_name  VARCHAR(50)  NOT NULL DEFAULT 'web',
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

UPDATE roles
   SET is_system = TRUE
 WHERE role_name IN ('Super Admin', 'Admin')
   AND is_system IS DISTINCT FROM TRUE;

CREATE TABLE IF NOT EXISTS permissions (
    permission_id   BIGSERIAL PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL,
    guard_name      VARCHAR(50)  NOT NULL DEFAULT 'web',
    module          VARCHAR(50)  NOT NULL,
    action          VARCHAR(50)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (permission_name, guard_name)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

CREATE TABLE IF NOT EXISTS role_has_permissions (
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    role_id       BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_rhp_role ON role_has_permissions(role_id);

CREATE TABLE IF NOT EXISTS user_has_permissions (
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    user_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_uhp_user ON user_has_permissions(user_id);

CREATE TABLE IF NOT EXISTS organizations (
    organization_id     SMALLINT PRIMARY KEY DEFAULT 1 CHECK (organization_id = 1),
    name                VARCHAR(150) NOT NULL,
    founded_date        DATE,
    logo_url            VARCHAR(500),
    logo_dark_url       VARCHAR(500),
    icon_url            VARCHAR(500),
    signature_url       VARCHAR(500),
    website_url         VARCHAR(255),
    email               VARCHAR(150),
    phone               VARCHAR(30),
    address             VARCHAR(500),
    city                VARCHAR(100),
    postal_code         VARCHAR(20),
    country             VARCHAR(100),
    facebook_url        VARCHAR(255),
    tiktok_url          VARCHAR(255),
    instagram_url       VARCHAR(255),
    primary_color       VARCHAR(16)  NOT NULL DEFAULT '#101848',
    secondary_color     VARCHAR(16)  NOT NULL DEFAULT '#74BCF8',
    sidebar_bg          VARCHAR(16)  NOT NULL DEFAULT '#101848',
    sidebar_text        VARCHAR(16)  NOT NULL DEFAULT '#C7CEDB',
    sidebar_active_bg   VARCHAR(16)  NOT NULL DEFAULT '#1A255C',
    sidebar_active_text VARCHAR(16)  NOT NULL DEFAULT '#FFFFFF',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

INSERT INTO organizations (
    organization_id, name, email, phone, address, logo_url
)
SELECT 1, company_name, company_email, company_phone, company_address, logo
  FROM settings
 WHERE setting_id = 1
ON CONFLICT (organization_id) DO NOTHING;
