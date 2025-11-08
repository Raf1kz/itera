/*
  # User Profiles Table

  ## Overview
  Stores user profile information, statistics, and settings for authenticated users.

  ## New Tables

  ### `user_profiles`
  Stores user profile data and learning statistics
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text) - User email (from auth)
  - `display_name` (text, nullable) - Optional display name
  - `avatar_url` (text, nullable) - Optional avatar URL
  - `total_cards` (integer) - Total cards created
  - `total_reviews` (integer) - Total review sessions completed
  - `mastered_cards` (integer) - Number of mastered cards
  - `current_streak` (integer) - Current daily study streak
  - `longest_streak` (integer) - Longest study streak
  - `last_study_date` (date, nullable) - Last study session date
  - `preferences` (jsonb) - User preferences and settings
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on user_profiles table
  - Users can only view and update their own profile
  - Profile automatically created on user signup

  ## Triggers
  - Auto-create profile when new user signs up
  - Auto-update updated_at timestamp
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  total_cards integer DEFAULT 0,
  total_reviews integer DEFAULT 0,
  mastered_cards integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_study_date date,
  preferences jsonb DEFAULT '{
    "dailyGoal": 20,
    "notificationsEnabled": true,
    "theme": "light",
    "language": "fr"
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.jwt()->>'sub' = id::text);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.jwt()->>'sub' = id::text);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.jwt()->>'sub' = id::text)
  WITH CHECK (auth.jwt()->>'sub' = id::text);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata jsonb;
  avatar text;
  display_name text;
BEGIN
  -- Get user metadata (contains OAuth profile data)
  user_metadata := NEW.raw_user_meta_data;

  -- Extract avatar URL from metadata (Google OAuth provides this)
  avatar := user_metadata->>'avatar_url';

  -- Extract display name (Google provides 'full_name' or 'name')
  display_name := COALESCE(
    user_metadata->>'full_name',
    user_metadata->>'name',
    split_part(NEW.email, '@', 1)  -- Fallback to email username
  );

  INSERT INTO user_profiles (id, email, avatar_url, display_name)
  VALUES (NEW.id, NEW.email, avatar, display_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS void AS $$
BEGIN
  -- Update total_cards count for all users
  UPDATE user_profiles up
  SET total_cards = (
    SELECT COUNT(*)
    FROM cards c
    WHERE c.user_id = up.id AND c.status = 'accepted'
  );

  -- Update mastered_cards count for all users
  UPDATE user_profiles up
  SET mastered_cards = (
    SELECT COUNT(*)
    FROM fsrs_data f
    WHERE f.user_id = up.id
      AND f.state = 'review'
      AND f.stability > 30
  );
END;
$$ LANGUAGE plpgsql;
