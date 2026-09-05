-- Members can share job titles with employees.

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS job_title_id BIGINT REFERENCES job_titles(job_title_id);

INSERT INTO job_titles (title_name)
SELECT DISTINCT TRIM(position)
  FROM members
 WHERE position IS NOT NULL
   AND TRIM(position) <> ''
   AND NOT EXISTS (
         SELECT 1 FROM job_titles t WHERE t.title_name = TRIM(members.position)
       );

UPDATE members m
   SET job_title_id = t.job_title_id
  FROM job_titles t
 WHERE m.job_title_id IS NULL
   AND m.position IS NOT NULL
   AND TRIM(m.position) = t.title_name;

CREATE INDEX IF NOT EXISTS idx_members_job_title_id ON members(job_title_id);
