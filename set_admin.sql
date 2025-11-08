-- Script to set admin role for a user
-- Run this in the Supabase SQL Editor

-- Step 1: Find your user ID (replace the email with yours)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Set admin role (replace USER_ID with the ID from step 1)
-- UPDATE user_profiles SET role = 'admin' WHERE id = 'USER_ID';

-- Or, do it in one command:
UPDATE user_profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'your-email@example.com'  -- Replace with your actual email
);

-- Verify the change
SELECT
  up.id,
  au.email,
  up.role,
  up.display_name
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin';
