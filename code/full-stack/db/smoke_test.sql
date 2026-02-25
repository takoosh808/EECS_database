\set ON_ERROR_STOP on

INSERT INTO labs (name)
VALUES ('Smoke Lab')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name)
VALUES ('Smoke Category')
ON CONFLICT DO NOTHING;

INSERT INTO assets (name, category_id, lab_id, serial_number, checked_out_to, checked_out)
VALUES (
  'Smoke Asset',
  (SELECT id FROM categories WHERE name = 'Smoke Category' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM labs WHERE name = 'Smoke Lab' ORDER BY created_at DESC LIMIT 1),
  'SMOKE-20260225-001',
  NULL,
  FALSE
)
ON CONFLICT (serial_number) DO UPDATE
SET name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    lab_id = EXCLUDED.lab_id,
    checked_out = FALSE,
    checked_out_to = NULL;

SELECT 'READ_AFTER_INSERT' AS stage,
       a.name AS asset_name,
       a.serial_number,
       a.checked_out,
       a.checked_out_to,
       c.name AS category_name,
       l.name AS lab_name
FROM assets a
JOIN categories c ON c.id = a.category_id
JOIN labs l ON l.id = a.lab_id
WHERE a.serial_number = 'SMOKE-20260225-001';

UPDATE assets
SET checked_out = TRUE,
    checked_out_to = 'smoke.user@wsu.edu'
WHERE serial_number = 'SMOKE-20260225-001';

SELECT 'READ_AFTER_CHECKOUT' AS stage,
       serial_number,
       checked_out,
       checked_out_to,
       created_at,
       updated_at
FROM assets
WHERE serial_number = 'SMOKE-20260225-001';

UPDATE assets
SET checked_out = FALSE,
    checked_out_to = NULL
WHERE serial_number = 'SMOKE-20260225-001';

DELETE FROM assets WHERE serial_number = 'SMOKE-20260225-001';
DELETE FROM categories WHERE name = 'Smoke Category';
DELETE FROM labs WHERE name = 'Smoke Lab';

SELECT 'POST_CLEANUP_COUNT' AS stage,
       COUNT(*) AS remaining_assets
FROM assets
WHERE serial_number = 'SMOKE-20260225-001';
