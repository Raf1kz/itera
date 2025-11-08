/*
  # Flashcard App Database Schema

  ## Overview
  Creates tables for storing flashcards and spaced repetition data, replacing localStorage.

  ## New Tables
  
  ### `cards`
  Stores flashcard content and metadata
  - `id` (text, primary key) - Unique card identifier
  - `user_id` (uuid, nullable) - User who owns the card (null for anonymous)
  - `question` (text) - Card question/front
  - `answer` (text) - Card answer/back
  - `type` (text) - Card type (Definition, Cloze, etc.)
  - `hint` (text, nullable) - Optional hint
  - `category` (text, nullable) - Card category/topic
  - `difficulty` (integer) - Difficulty level (1-5)
  - `bloom` (text, nullable) - Bloom's taxonomy level
  - `tags` (jsonb) - Array of tags
  - `status` (text) - 'proposed' or 'accepted'
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `fsrs_data`
  Stores FSRS spaced repetition scheduling data
  - `card_id` (text, primary key) - References cards.id
  - `user_id` (uuid, nullable) - User who owns the data (null for anonymous)
  - `stability` (float) - FSRS stability parameter
  - `difficulty` (float) - FSRS difficulty parameter
  - `elapsed_days` (float) - Days since last review
  - `scheduled_days` (float) - Days until next review
  - `reps` (integer) - Number of repetitions
  - `lapses` (integer) - Number of lapses/failures
  - `state` (text) - Card state (new, learning, review, relearning)
  - `last_review` (timestamptz, nullable) - Last review timestamp
  - `due` (timestamptz, nullable) - Due date for next review
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on both tables
  - Anonymous users can CRUD their own data (identified by null user_id + session)
  - Authenticated users can CRUD their own data (identified by auth.jwt()->>'sub')

  ## Notes
  - user_id is nullable to support anonymous usage
  - When user logs in, they can claim their anonymous cards
  - Status field enables proposed/accepted workflow from AI generation
*/

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  type text NOT NULL DEFAULT 'Definition',
  hint text,
  category text,
  difficulty integer DEFAULT 3,
  bloom text,
  tags jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fsrs_data table
CREATE TABLE IF NOT EXISTS fsrs_data (
  card_id text PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stability float DEFAULT 0,
  difficulty float DEFAULT 0,
  elapsed_days float DEFAULT 0,
  scheduled_days float DEFAULT 0,
  reps integer DEFAULT 0,
  lapses integer DEFAULT 0,
  state text NOT NULL DEFAULT 'new',
  last_review timestamptz,
  due timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_user_status ON cards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_fsrs_user_id ON fsrs_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fsrs_due ON fsrs_data(due);
CREATE INDEX IF NOT EXISTS idx_fsrs_state ON fsrs_data(state);

-- Enable Row Level Security
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cards table
-- Anonymous users (user_id IS NULL) can access their own data
-- Authenticated users can access their own data

CREATE POLICY "Users can view own cards"
  ON cards FOR SELECT
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can insert own cards"
  ON cards FOR INSERT
  WITH CHECK (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can update own cards"
  ON cards FOR UPDATE
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  )
  WITH CHECK (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can delete own cards"
  ON cards FOR DELETE
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

-- RLS Policies for fsrs_data table

CREATE POLICY "Users can view own fsrs data"
  ON fsrs_data FOR SELECT
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can insert own fsrs data"
  ON fsrs_data FOR INSERT
  WITH CHECK (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can update own fsrs data"
  ON fsrs_data FOR UPDATE
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  )
  WITH CHECK (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

CREATE POLICY "Users can delete own fsrs data"
  ON fsrs_data FOR DELETE
  USING (
    (user_id IS NULL) OR (auth.jwt()->>'sub' = user_id::text)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fsrs_updated_at
  BEFORE UPDATE ON fsrs_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
