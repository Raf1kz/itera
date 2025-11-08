-- Script to clear all test/boilerplate data from the database
-- Run this in the Supabase SQL Editor

-- CAUTION: This will delete ALL cards and FSRS data
-- Make sure you want to do this before running!

-- Clear all flashcards (will cascade to fsrs_data due to foreign key)
DELETE FROM cards;

-- Clear all FSRS data (in case there are orphaned records)
DELETE FROM fsrs_data;

-- Reset user statistics
UPDATE user_profiles
SET
  total_cards = 0,
  total_reviews = 0,
  mastered_cards = 0,
  current_streak = 0,
  last_study_date = NULL;

-- Verify cleanup
SELECT
  'Cards remaining:' AS status,
  COUNT(*) AS count
FROM cards
UNION ALL
SELECT
  'FSRS records remaining:' AS status,
  COUNT(*) AS count
FROM fsrs_data
UNION ALL
SELECT
  'User profiles:' AS status,
  COUNT(*) AS count
FROM user_profiles;
