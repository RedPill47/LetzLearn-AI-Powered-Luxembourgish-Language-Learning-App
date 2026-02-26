-- Add speaking exercises to daily_challenges table
ALTER TABLE public.daily_challenges
ADD COLUMN IF NOT EXISTS speaking_exercises_goal INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS speaking_exercises_completed INTEGER DEFAULT 0;

-- Add comment to document the columns
COMMENT ON COLUMN public.daily_challenges.speaking_exercises_goal IS 'Goal for speaking exercises (pronunciation/dialog) for this challenge';
COMMENT ON COLUMN public.daily_challenges.speaking_exercises_completed IS 'Number of speaking exercises completed for this challenge';

