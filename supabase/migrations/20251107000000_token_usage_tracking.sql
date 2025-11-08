-- Migration: Token Usage Tracking and Cost Management
-- Purpose: Track OpenAI API token usage per user to prevent runaway costs
-- Created: 2025-11-07

-- Create token_usage table to track all OpenAI API calls
CREATE TABLE IF NOT EXISTS public.token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  tokens_total integer NOT NULL,
  cost_usd numeric(10,6) NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  request_id text,
  endpoint text DEFAULT 'generate-flashcards',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast daily usage queries
CREATE INDEX idx_token_usage_user_date ON public.token_usage(user_id, created_at DESC);
CREATE INDEX idx_token_usage_request_id ON public.token_usage(request_id);

-- Enable RLS
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own token usage
CREATE POLICY token_usage_user_read ON public.token_usage
  FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

-- RLS Policy: Service role can insert token usage (edge function)
CREATE POLICY token_usage_service_insert ON public.token_usage
  FOR INSERT
  WITH CHECK (true);  -- Service role bypasses RLS anyway

-- Create function to get daily token usage for a user
CREATE OR REPLACE FUNCTION get_daily_token_usage(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_tokens integer;
  daily_cost numeric;
  daily_requests integer;
BEGIN
  SELECT
    COALESCE(SUM(tokens_total), 0),
    COALESCE(SUM(cost_usd), 0),
    COUNT(*)
  INTO daily_tokens, daily_cost, daily_requests
  FROM token_usage
  WHERE user_id = p_user_id
    AND created_at >= (now() - interval '24 hours');

  RETURN jsonb_build_object(
    'daily_tokens', daily_tokens,
    'daily_cost', daily_cost,
    'daily_requests', daily_requests,
    'reset_at', now() + interval '24 hours'
  );
END;
$$;

-- Create function to get monthly cost report (admin only)
CREATE OR REPLACE FUNCTION get_monthly_cost_report()
RETURNS TABLE(
  user_id text,
  total_tokens bigint,
  total_cost numeric,
  request_count bigint,
  avg_tokens_per_request numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    user_id,
    SUM(tokens_total) as total_tokens,
    SUM(cost_usd) as total_cost,
    COUNT(*) as request_count,
    ROUND(AVG(tokens_total), 2) as avg_tokens_per_request
  FROM token_usage
  WHERE created_at >= date_trunc('month', now())
  GROUP BY user_id
  ORDER BY total_cost DESC;
$$;

-- Add comment for documentation
COMMENT ON TABLE public.token_usage IS 'Tracks OpenAI API token usage and costs per user for budget management';
COMMENT ON FUNCTION get_daily_token_usage IS 'Returns daily token usage statistics for budget enforcement';
COMMENT ON FUNCTION get_monthly_cost_report IS 'Admin function to monitor monthly OpenAI costs across all users';
