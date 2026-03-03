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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_checkout(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  checkout_status VARCHAR(30) DEFAULT 'PENDING',
  request_date TIMESTAMPTZ DEFAULT NOW(),
  checkout_length INTEGER,
  processed_by UUID,
  returned_at TIMESTAMPTZ,
  CHECK (checkout_status IN ('PENDING','ACTIVE','RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED'))
);


CREATE TYPE message_type_enum AS ENUM (
    'INSTRUCTION',
    'REASON',
    'NOTIFICATION'
);

--sender_id needs to reference admin id once the table exists for users
CREATE TABLE IF NOT EXISTS asset_checkout_messages(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id UUID NOT NULL REFERENCES asset_checkout(id),
  sender_id UUID DEFAULT NULL,
  message_type message_type_enum NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX one_active_checkout_per_asset
ON asset_checkout(asset_id)
WHERE checkout_status = 'ACTIVE' AND returned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_lab_id ON assets(lab_id);
CREATE INDEX IF NOT EXISTS idx_assets_checkout_status ON asset_checkout(checkout_status);

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
