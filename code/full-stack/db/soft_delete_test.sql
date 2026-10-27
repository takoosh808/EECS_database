-- Run after migration 008. All test records are rolled back.
BEGIN;
DO $$
DECLARE
  test_user UUID;
  test_asset UUID;
  test_checkout UUID;
BEGIN
  INSERT INTO users (name, email, password_hash) VALUES
    ('Soft delete test', gen_random_uuid()::text || '@test.invalid', 'test-only')
    RETURNING user_id INTO test_user;
  INSERT INTO assets (name, serial_number) VALUES
    ('Soft delete test', gen_random_uuid()::text) RETURNING asset_id INTO test_asset;
  INSERT INTO asset_checkout (asset_id, user_id, checkout_status)
    VALUES (test_asset, test_user, 'PENDING') RETURNING checkout_id INTO test_checkout;

  BEGIN
    UPDATE assets SET is_deleted = TRUE WHERE asset_id = test_asset;
    RAISE EXCEPTION 'Expected pending asset deletion to be blocked';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE asset_checkout SET checkout_status = 'DENIED' WHERE checkout_id = test_checkout;
  UPDATE assets SET is_deleted = TRUE WHERE asset_id = test_asset;
  UPDATE assets SET is_deleted = FALSE WHERE asset_id = test_asset;
  UPDATE asset_checkout SET checkout_status = 'ACTIVE' WHERE checkout_id = test_checkout;

  BEGIN
    UPDATE assets SET is_deleted = TRUE WHERE asset_id = test_asset;
    RAISE EXCEPTION 'Expected active asset deletion to be blocked';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE asset_checkout SET checkout_status = 'RETURNED' WHERE checkout_id = test_checkout;
  UPDATE assets SET is_deleted = TRUE WHERE asset_id = test_asset;
  IF NOT EXISTS (SELECT 1 FROM assets WHERE asset_id = test_asset AND is_deleted) OR
     NOT EXISTS (SELECT 1 FROM asset_checkout WHERE checkout_id = test_checkout) THEN
    RAISE EXCEPTION 'Soft deletion must retain the asset and history';
  END IF;

  BEGIN
    INSERT INTO asset_checkout (asset_id, user_id) VALUES (test_asset, test_user);
    RAISE EXCEPTION 'Expected requests for deleted assets to be blocked';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE asset_checkout SET checkout_status = 'ACTIVE' WHERE checkout_id = test_checkout;
    RAISE EXCEPTION 'Expected approval for deleted assets to be blocked';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE assets SET is_deleted = FALSE WHERE asset_id = test_asset;
  UPDATE asset_checkout SET checkout_status = 'ACTIVE' WHERE checkout_id = test_checkout;
  IF NOT EXISTS (SELECT 1 FROM assets WHERE asset_id = test_asset AND NOT is_deleted) THEN
    RAISE EXCEPTION 'Restore failed';
  END IF;
END;
$$;
ROLLBACK;
