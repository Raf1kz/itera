/*
  # Add Deck Name to Cards

  ## Changes
  - Adds deck_name column to cards table for simple folder/deck organization
  - Adds index for efficient deck queries
  - Backfills existing cards with 'General' deck name

  ## Usage
  - Cards can now be grouped by deck_name for organization
  - deck_name defaults to 'General' for new cards
*/

-- Add deck_name column to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS deck_name text DEFAULT 'General';

-- Add index for efficient deck queries
CREATE INDEX IF NOT EXISTS idx_cards_deck_name ON public.cards(deck_name);
CREATE INDEX IF NOT EXISTS idx_cards_user_deck ON public.cards(user_id, deck_name);

-- Backfill existing cards with 'General' deck name
UPDATE public.cards
SET deck_name = 'General'
WHERE deck_name IS NULL;

-- Make deck_name NOT NULL after backfilling
ALTER TABLE public.cards
ALTER COLUMN deck_name SET NOT NULL;
