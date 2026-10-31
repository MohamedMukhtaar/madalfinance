-- Same month may have many charges, but not the same reason twice.
-- Rename any existing duplicates so the unique index can be created.
DO $$
DECLARE
  rec RECORD;
  bid BIGINT;
  i INT;
BEGIN
  FOR rec IN
    SELECT year, month, lower(trim(reason)) AS rkey,
           array_agg(batch_id ORDER BY batch_id) AS ids
      FROM member_due_batches
     GROUP BY year, month, lower(trim(reason))
    HAVING COUNT(*) > 1
  LOOP
    i := 1;
    FOREACH bid IN ARRAY rec.ids[2:array_length(rec.ids, 1)]
    LOOP
      i := i + 1;
      UPDATE member_due_batches
         SET reason = trim(reason) || ' #' || i::text
       WHERE batch_id = bid;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_due_batches_period_reason
    ON member_due_batches (year, month, lower(trim(reason)));
