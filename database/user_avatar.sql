-- Profile photo for login users (mirrors members.avatar_path / avatar_name).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_path   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS avatar_name   VARCHAR(255);
