CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  serial_number TEXT NOT NULL UNIQUE,
  checked_out_to TEXT,
  checked_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assets_checkout_consistency_chk
    CHECK (
      (checked_out = TRUE AND checked_out_to IS NOT NULL)
      OR
      (checked_out = FALSE AND checked_out_to IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_lab_id ON assets(lab_id);
CREATE INDEX IF NOT EXISTS idx_assets_checked_out ON assets(checked_out);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assets_set_updated_at ON assets;
CREATE TRIGGER trg_assets_set_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
