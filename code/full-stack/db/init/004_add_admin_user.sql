-- Create an admin test user for testing admin features
-- Email: admin@wsu.edu
-- Password: admin123

INSERT INTO users (name, email, role, password_hash)
VALUES (
  'Admin User',
  'admin@wsu.edu',
  'admin',
  'scrypt$7f5c79fd817fdbaeb366b91260094b25$224f691718be643a1f393a458b989d41bd92c42be7d8c09a14f4882deba1900a1bd59514853f8ea9050bdcdeb750f904fc5ee9910304c3829257c198e17bafcc'
)
ON CONFLICT (email) DO NOTHING;
