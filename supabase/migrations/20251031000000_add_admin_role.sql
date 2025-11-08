/*
  # Add Admin Role Support

  ## Overview
  Adds role-based access control to user_profiles table

  ## Changes
  - Add `role` column to user_profiles table (default: 'user')
  - Add index for role-based queries
  - Update RLS policies to allow admins to view all data

  ## Security
  - Only admins can view all profiles
  - Regular users can only view their own profile
*/

-- Add role column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- New RLS policies with admin support
CREATE POLICY "Users can view own profile or admins can view all"
  ON user_profiles FOR SELECT
  USING (
    auth.jwt()->>'sub' = id::text
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.jwt()->>'sub' AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.jwt()->>'sub' = id::text)
  WITH CHECK (auth.jwt()->>'sub' = id::text);

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.jwt()->>'sub' AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
