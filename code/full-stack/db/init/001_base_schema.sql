CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users(
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_chk CHECK (role IN ('user', 'admin'))
);



CREATE TABLE IF NOT EXISTS categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_categories (
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

  PRIMARY KEY (asset_id, category_id)
);

CREATE TABLE IF NOT EXISTS asset_checkout(
  checkout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(user_id),
  r4r TEXT,
  checkout_status VARCHAR(30) DEFAULT 'PENDING',
  request_date TIMESTAMPTZ DEFAULT NOW(),
  checkout_length INTEGER,
  due_date TIMESTAMPTZ,
  processed_by UUID,
  returned_at TIMESTAMPTZ,
  CHECK (checkout_status IN ('PENDING','ACTIVE', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'DENIED'))
);



--sender_id needs to reference admin id once the table exists for users
CREATE TABLE IF NOT EXISTS asset_checkout_messages(
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user(user_id),
  receiver_id UUID NOT NULL REFERENCES user(user_id),
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


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
