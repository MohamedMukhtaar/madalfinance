-- Dedicated sidebar shell colors (separate from primary / secondary accents).
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS sidebar_bg   VARCHAR(16) NOT NULL DEFAULT '#101848',
    ADD COLUMN IF NOT EXISTS sidebar_text VARCHAR(16) NOT NULL DEFAULT '#C7CEDB';

-- Backfill from previous mapping (secondary was used as shell bg).
UPDATE organizations
   SET sidebar_bg = COALESCE(NULLIF(secondary_color, ''), '#101848')
 WHERE sidebar_bg IS NULL OR sidebar_bg = '#101848';
