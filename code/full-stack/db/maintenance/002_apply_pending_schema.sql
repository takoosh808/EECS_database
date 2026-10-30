-- Idempotent catch-up for databases created before soft delete and notifications existed.
BEGIN;

ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS notification_history (
  noto_id UUID NOT NULL DEFAULT gen_random_uuid(),
  checkout_id UUID,
  UNIQUE(checkout_id),
  due_in_week BOOLEAN DEFAULT FALSE,
  due_tomorrow BOOLEAN DEFAULT FALSE,
  overdue BOOLEAN DEFAULT FALSE,
  checkout_status TEXT,
  PRIMARY KEY(noto_id, checkout_id),
  FOREIGN KEY (checkout_id) REFERENCES asset_checkout(checkout_id)
);

CREATE OR REPLACE FUNCTION guard_deleted_asset_checkout()
RETURNS TRIGGER AS $$
DECLARE deleted BOOLEAN;
BEGIN
  IF NEW.checkout_status IN ('PENDING', 'ACTIVE', 'RETURN_REQUESTED', 'RETURN_APPROVED') THEN
    SELECT is_deleted INTO deleted FROM assets WHERE asset_id = NEW.asset_id FOR UPDATE;
    IF deleted THEN
      RAISE EXCEPTION 'Asset is deleted; restore it before requesting or approving checkout'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_deleted_asset_checkout ON asset_checkout;
CREATE TRIGGER trg_guard_deleted_asset_checkout
BEFORE INSERT OR UPDATE OF checkout_status, asset_id ON asset_checkout
FOR EACH ROW EXECUTE FUNCTION guard_deleted_asset_checkout();

CREATE OR REPLACE FUNCTION guard_active_asset_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted AND NOT OLD.is_deleted THEN
    IF EXISTS (
      SELECT 1 FROM asset_checkout WHERE asset_id = NEW.asset_id AND checkout_status = 'PENDING'
    ) THEN
      RAISE EXCEPTION 'This asset has pending requests. Clear them before removing the asset.'
        USING ERRCODE = '23514', CONSTRAINT = 'asset_pending_requests';
    END IF;
    IF EXISTS (
      SELECT 1 FROM asset_checkout WHERE asset_id = NEW.asset_id
        AND checkout_status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_APPROVED')
    ) THEN
      RAISE EXCEPTION 'Cannot remove an asset while it is checked out'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_active_asset_deletion ON assets;
CREATE TRIGGER trg_guard_active_asset_deletion
BEFORE UPDATE OF is_deleted ON assets
FOR EACH ROW EXECUTE FUNCTION guard_active_asset_deletion();

COMMIT;
