ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

UPDATE users
SET role = 'user'
WHERE role IS NULL;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_chk'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_chk CHECK (role IN ('user', 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
    UPDATE users
    SET role = 'admin'
    WHERE id = (
      SELECT id
      FROM users
      ORDER BY created_at ASC NULLS LAST, id ASC
      LIMIT 1
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
      AND is_nullable = 'YES'
  ) THEN
    BEGIN
      ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping NOT NULL on users.password_hash (existing rows may need values).';
    END;
  END IF;
END
$$;
