-- Two roles only: Super Admin (full access) and Admin (all except trash).
INSERT IGNORE INTO roles (role_name) VALUES ('Admin');

UPDATE users u
  JOIN roles r ON r.role_id = u.role_id
  JOIN roles admin_role ON admin_role.role_name = 'Admin'
   SET u.role_id = admin_role.role_id
 WHERE r.role_name IN ('Finance Admin', 'Member');

DELETE FROM roles WHERE role_name IN ('Finance Admin', 'Member');
