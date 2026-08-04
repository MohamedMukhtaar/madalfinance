-- Member profile photos for login "Trusted by" avatars
ALTER TABLE members
  ADD COLUMN avatar_path VARCHAR(255) NULL AFTER position,
  ADD COLUMN avatar_name VARCHAR(255) NULL AFTER avatar_path;
