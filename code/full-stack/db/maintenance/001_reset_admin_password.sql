-- One-time reset of the admin password to "admin123". Change it after logging in.
CREATE TABLE IF NOT EXISTS maintenance_runs (
  name TEXT PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM maintenance_runs WHERE name = '001_reset_admin_password'
  ) THEN
    UPDATE users
    SET password_hash = 'scrypt$1f2245c264d3dd320f87a3d91e7bd859$808fdbc721ade2ae87e483ec88b86ae88e11135da152ffd765cbc61007ad9b3fd86fefd598bdf6cd1e4362b04a315b6cbf170295aef04c59e87a731df5d85e1f',
        updated_at = NOW()
    WHERE email = 'admin@wsu.edu';

    INSERT INTO maintenance_runs (name) VALUES ('001_reset_admin_password');
  END IF;
END
$$;
