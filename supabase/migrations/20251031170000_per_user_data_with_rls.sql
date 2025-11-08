/*
  # Per-User Data Storage with Row-Level Security

  ## Overview
  Creates user-scoped tables for cards, summaries, reviews, and admin registry.
  Implements RLS policies to ensure data isolation between users while allowing admin access.

  ## Tables Created
  1. cards - Flashcards created from generation
  2. summaries - Text summaries from generation
  3. reviews - Study session reviews (FSRS)
  4. app_admins - Admin user registry
  5. generation_log - Idempotency tracking

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Admins can read all data (via app_admins table)
  - Service role bypasses RLS for edge functions
*/

-- ============================================================================
-- TABLES
-- ============================================================================

-- Drop existing tables if they conflict (keep user_profiles from previous migration)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.app_admins CASCADE;
DROP TABLE IF EXISTS public.generation_log CASCADE;

-- Cards table (replaces old cards table with Clerk user_id)
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,                 -- Clerk user id (string)
  deck_id uuid,                          -- Optional future deck grouping
  front text NOT NULL,
  back text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_cards_created_at ON public.cards(created_at DESC);

-- Summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  word_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_summaries_user_id ON public.summaries(user_id);
CREATE INDEX idx_summaries_created_at ON public.summaries(created_at DESC);

-- Reviews table (FSRS tracking)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  scheduled_at timestamptz NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  interval_days integer NOT NULL,
  ease float8 NOT NULL
);

CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_card_id ON public.reviews(card_id);
CREATE INDEX idx_reviews_reviewed_at ON public.reviews(reviewed_at DESC);

-- Admin registry table
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Generation log for idempotency
CREATE TABLE IF NOT EXISTS public.generation_log (
  idempotency_key text PRIMARY KEY,
  user_id text NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_log_user_id ON public.generation_log(user_id);
CREATE INDEX idx_generation_log_created_at ON public.generation_log(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - CARDS
-- ============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Cards policies
CREATE POLICY "cards_owner_can_read" ON public.cards
  FOR SELECT
  USING (
    user_id = auth.jwt()->>'sub'
    OR public.is_user_admin(auth.jwt()->>'sub')
  );

CREATE POLICY "cards_owner_can_insert" ON public.cards
  FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "cards_owner_can_update" ON public.cards
  FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "cards_owner_or_admin_can_delete" ON public.cards
  FOR DELETE
  USING (
    user_id = auth.jwt()->>'sub'
    OR public.is_user_admin(auth.jwt()->>'sub')
  );

-- ============================================================================
-- RLS POLICIES - SUMMARIES
-- ============================================================================

CREATE POLICY "summaries_owner_can_read" ON public.summaries
  FOR SELECT
  USING (
    user_id = auth.jwt()->>'sub'
    OR public.is_user_admin(auth.jwt()->>'sub')
  );

CREATE POLICY "summaries_owner_can_insert" ON public.summaries
  FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "summaries_owner_can_update" ON public.summaries
  FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "summaries_owner_can_delete" ON public.summaries
  FOR DELETE
  USING (
    user_id = auth.jwt()->>'sub'
    OR public.is_user_admin(auth.jwt()->>'sub')
  );

-- ============================================================================
-- RLS POLICIES - REVIEWS
-- ============================================================================

CREATE POLICY "reviews_owner_can_read" ON public.reviews
  FOR SELECT
  USING (
    user_id = auth.jwt()->>'sub'
    OR public.is_user_admin(auth.jwt()->>'sub')
  );

CREATE POLICY "reviews_owner_can_insert" ON public.reviews
  FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "reviews_owner_can_update" ON public.reviews
  FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "reviews_owner_can_delete" ON public.reviews
  FOR DELETE
  USING (user_id = auth.jwt()->>'sub');

-- ============================================================================
-- RLS POLICIES - ADMIN REGISTRY
-- ============================================================================

-- Admins can read the admin list, regular users cannot
CREATE POLICY "admins_can_read_admin_list" ON public.app_admins
  FOR SELECT
  USING (public.is_user_admin(auth.jwt()->>'sub'));

-- ============================================================================
-- RLS POLICIES - GENERATION LOG
-- ============================================================================

CREATE POLICY "generation_log_owner_can_read" ON public.generation_log
  FOR SELECT
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "generation_log_owner_can_insert" ON public.generation_log
  FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on cards
CREATE OR REPLACE FUNCTION update_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at_trigger
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION update_cards_updated_at();

-- Auto-calculate word count on summaries
CREATE OR REPLACE FUNCTION update_summary_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER summaries_word_count_trigger
  BEFORE INSERT OR UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_summary_word_count();

-- ============================================================================
-- CLEANUP OLD GENERATION LOGS (optional maintenance)
-- ============================================================================

-- Function to clean up old generation logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_generation_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.generation_log
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Service role (used by edge functions) bypasses RLS automatically
-- Clerk JWT must include 'sub' claim for RLS evaluation
-- To add an admin: INSERT INTO public.app_admins (user_id) VALUES ('clerk_user_id_here');
