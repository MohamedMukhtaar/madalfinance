-- Employee organization: departments, job titles, branches, shifts.

CREATE TABLE IF NOT EXISTS departments (
    department_id     BIGSERIAL PRIMARY KEY,
    department_name   VARCHAR(100) NOT NULL UNIQUE,
    notes             TEXT,
    status            active_status NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_titles (
    job_title_id      BIGSERIAL PRIMARY KEY,
    title_name        VARCHAR(100) NOT NULL UNIQUE,
    notes             TEXT,
    status            active_status NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
    branch_id         BIGSERIAL PRIMARY KEY,
    branch_name       VARCHAR(100) NOT NULL UNIQUE,
    notes             TEXT,
    status            active_status NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
    shift_id          BIGSERIAL PRIMARY KEY,
    shift_name        VARCHAR(100) NOT NULL UNIQUE,
    start_time        TIME,
    end_time          TIME,
    notes             TEXT,
    status            active_status NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS job_title_id BIGINT REFERENCES job_titles(job_title_id);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(department_id);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(branch_id);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shifts(shift_id);

INSERT INTO departments (department_name)
SELECT DISTINCT TRIM(department)
  FROM employees
 WHERE department IS NOT NULL
   AND TRIM(department) <> ''
   AND NOT EXISTS (
         SELECT 1 FROM departments d WHERE d.department_name = TRIM(employees.department)
       );

INSERT INTO job_titles (title_name)
SELECT DISTINCT TRIM(job_title)
  FROM employees
 WHERE job_title IS NOT NULL
   AND TRIM(job_title) <> ''
   AND NOT EXISTS (
         SELECT 1 FROM job_titles t WHERE t.title_name = TRIM(employees.job_title)
       );

UPDATE employees e
   SET department_id = d.department_id
  FROM departments d
 WHERE e.department_id IS NULL
   AND e.department IS NOT NULL
   AND TRIM(e.department) = d.department_name;

UPDATE employees e
   SET job_title_id = t.job_title_id
  FROM job_titles t
 WHERE e.job_title_id IS NULL
   AND e.job_title IS NOT NULL
   AND TRIM(e.job_title) = t.title_name;

CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_title_id ON employees(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_shift_id ON employees(shift_id);

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
