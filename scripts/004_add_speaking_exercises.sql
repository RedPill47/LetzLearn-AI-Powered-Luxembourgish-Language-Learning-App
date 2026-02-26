-- Add speaking exercises tracking to user_stats table
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS total_speaking_exercises INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN public.user_stats.total_speaking_exercises IS 'Total number of speaking exercises completed (pronunciation and dialog practice)';

