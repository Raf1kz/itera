-- Add language column to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS language text;

-- Add language column to summaries table
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS language text;

-- Add index for language filtering on cards
CREATE INDEX IF NOT EXISTS idx_cards_language ON public.cards(language);

-- Add index for language filtering on summaries
CREATE INDEX IF NOT EXISTS idx_summaries_language ON public.summaries(language);

-- Comment on columns
COMMENT ON COLUMN public.cards.language IS 'Detected language of the card content (ISO 639-3 code)';
COMMENT ON COLUMN public.summaries.language IS 'Detected language of the summary content (ISO 639-3 code)';
