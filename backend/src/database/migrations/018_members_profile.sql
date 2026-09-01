-- Members are contribution profiles only (no login). Admin/Super Admin use users table.
ALTER TABLE members
  ADD COLUMN full_name VARCHAR(100) NULL AFTER member_id,
  ADD COLUMN phone VARCHAR(30) NULL AFTER full_name,
  ADD COLUMN email VARCHAR(150) NULL AFTER phone;

UPDATE members m
  JOIN users u ON u.user_id = m.user_id
   SET m.full_name = u.full_name,
       m.phone = u.phone,
       m.email = u.email;

-- Member profiles are not login accounts.
UPDATE users u
  INNER JOIN members m ON m.user_id = u.user_id
   SET u.status = 'inactive';

ALTER TABLE members MODIFY full_name VARCHAR(100) NOT NULL;

ALTER TABLE members DROP FOREIGN KEY fk_members_user;
ALTER TABLE members DROP INDEX user_id;
ALTER TABLE members DROP COLUMN user_id;
