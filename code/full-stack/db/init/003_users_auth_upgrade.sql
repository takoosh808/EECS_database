ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

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
