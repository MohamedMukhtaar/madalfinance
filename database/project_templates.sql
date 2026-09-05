-- Registered projects (offerings) vs customer assignments.

CREATE TABLE IF NOT EXISTS project_templates (
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

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES project_templates(template_id);

INSERT INTO project_templates (
    template_name, project_type_id, description, project_price,
    monthly_amount, setup_fee, billing_day, logo_path, logo_file_name, created_by
)
SELECT DISTINCT ON (p.project_name)
       p.project_name,
       p.project_type_id,
       p.description,
       p.project_price,
       COALESCE(rb.monthly_amount, 0),
       COALESCE(rb.setup_fee, 0),
       COALESCE(rb.billing_day, 1),
       p.logo_path,
       p.logo_file_name,
       p.created_by
  FROM projects p
  LEFT JOIN rental_billings rb ON rb.project_id = p.project_id
 WHERE p.deleted_at IS NULL
   AND NOT EXISTS (
         SELECT 1 FROM project_templates t WHERE t.template_name = p.project_name
       )
 ORDER BY p.project_name, p.project_id;

UPDATE projects p
   SET template_id = t.template_id
  FROM project_templates t
 WHERE p.template_id IS NULL
   AND p.deleted_at IS NULL
   AND p.project_name = t.template_name;
