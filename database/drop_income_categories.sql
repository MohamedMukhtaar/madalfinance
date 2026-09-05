-- Drop income_categories. Category is stored on other_income.category_name.

ALTER TABLE other_income
    ADD COLUMN IF NOT EXISTS category_name VARCHAR(50);

DO $$
BEGIN
  IF to_regclass('public.income_categories') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'other_income'
          AND column_name = 'income_category_id'
     ) THEN
    UPDATE other_income i
       SET category_name = ic.category_name
      FROM income_categories ic
     WHERE i.income_category_id = ic.income_category_id
       AND (i.category_name IS NULL OR btrim(i.category_name) = '');
  END IF;
END $$;

UPDATE other_income SET category_name = 'Other' WHERE category_name IS NULL;

ALTER TABLE other_income
    ALTER COLUMN category_name SET DEFAULT 'Other';

ALTER TABLE other_income
    ALTER COLUMN category_name SET NOT NULL;

ALTER TABLE other_income DROP CONSTRAINT IF EXISTS other_income_income_category_id_fkey;
ALTER TABLE other_income DROP COLUMN IF EXISTS income_category_id;

DROP TABLE IF EXISTS income_categories;
