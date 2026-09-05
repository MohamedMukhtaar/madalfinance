-- Per-customer discount off the registered project price.

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS discount NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (discount >= 0);
