-- Performance / task tracking — assign work to employees or members.

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'Done', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_assignee_type AS ENUM ('employee', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS performance_tasks (
    task_id         BIGSERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    priority        task_priority NOT NULL DEFAULT 'Medium',
    status          task_status NOT NULL DEFAULT 'Todo',
    due_date        DATE,
    assignee_type   task_assignee_type NOT NULL,
    employee_id     BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
    member_id       BIGINT REFERENCES members(member_id) ON DELETE SET NULL,
    created_by      BIGINT NOT NULL REFERENCES users(user_id),
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT performance_tasks_assignee_chk CHECK (
      (assignee_type = 'employee' AND employee_id IS NOT NULL AND member_id IS NULL)
      OR
      (assignee_type = 'member' AND member_id IS NOT NULL AND employee_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_perf_tasks_status ON performance_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_perf_tasks_assignee_emp ON performance_tasks(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_perf_tasks_assignee_mem ON performance_tasks(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_perf_tasks_due ON performance_tasks(due_date) WHERE deleted_at IS NULL;
