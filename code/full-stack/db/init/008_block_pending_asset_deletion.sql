BEGIN;

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

COMMIT;
