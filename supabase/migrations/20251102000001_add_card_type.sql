-- Add card_type column to support different flashcard formats
-- Types: 'qa' (Q&A), 'cloze' (Cloze deletion), 'mcq' (Multiple choice)

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_type text DEFAULT 'qa';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_data jsonb;

-- Create index for card_type filtering
CREATE INDEX IF NOT EXISTS idx_cards_type ON public.cards(card_type);

-- Add comments
COMMENT ON COLUMN public.cards.card_type IS 'Type of flashcard: qa (Q&A), cloze (Cloze deletion), or mcq (Multiple choice)';
COMMENT ON COLUMN public.cards.card_data IS 'Additional data for card types (e.g., MCQ options, cloze positions)';

-- Add check constraint to ensure valid card types
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_card_type_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_card_type_check
  CHECK (card_type IN ('qa', 'cloze', 'mcq'));
