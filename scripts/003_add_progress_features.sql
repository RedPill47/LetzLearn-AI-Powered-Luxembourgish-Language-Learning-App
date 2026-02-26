-- Add spaced repetition fields to vocabulary_cards
ALTER TABLE public.vocabulary_cards
ADD COLUMN IF NOT EXISTS mastery_level TEXT DEFAULT 'new' CHECK (mastery_level IN ('new', 'learning', 'reviewing', 'mastered')),
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3, 2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Create user_stats table for progress tracking
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_words_learned INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  total_quiz_questions INTEGER DEFAULT 0,
  total_quiz_correct INTEGER DEFAULT 0,
  total_study_time_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- User stats RLS policies
CREATE POLICY "stats_select_own" ON public.user_stats 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stats_insert_own" ON public.user_stats 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stats_update_own" ON public.user_stats 
  FOR UPDATE USING (auth.uid() = user_id);

-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  words_goal INTEGER DEFAULT 5,
  words_completed INTEGER DEFAULT 0,
  conversations_goal INTEGER DEFAULT 1,
  conversations_completed INTEGER DEFAULT 0,
  quiz_questions_goal INTEGER DEFAULT 10,
  quiz_questions_completed INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- Enable RLS on daily_challenges
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- Daily challenges RLS policies
CREATE POLICY "challenges_select_own" ON public.daily_challenges 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "challenges_insert_own" ON public.daily_challenges 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenges_update_own" ON public.daily_challenges 
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_next_review ON public.vocabulary_cards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_mastery ON public.vocabulary_cards(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON public.daily_challenges(user_id, challenge_date);

-- Function to initialize user stats on first use
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user stats when profile is created
CREATE TRIGGER on_profile_created_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_stats();

