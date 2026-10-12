BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_chk;

UPDATE users
SET role = 'admin'
WHERE role = 'owner';

ALTER TABLE users
  ADD CONSTRAINT users_role_chk CHECK (role IN ('user', 'admin'));

COMMIT;
