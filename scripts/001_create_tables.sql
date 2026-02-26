-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  learning_mode TEXT NOT NULL DEFAULT 'conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Chat conversations RLS policies
CREATE POLICY "conversations_select_own" ON public.chat_conversations 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own" ON public.chat_conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own" ON public.chat_conversations 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own" ON public.chat_conversations 
  FOR DELETE USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages RLS policies
CREATE POLICY "messages_select_own" ON public.chat_messages 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own" ON public.chat_messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_delete_own" ON public.chat_messages 
  FOR DELETE USING (auth.uid() = user_id);

-- Create vocabulary_cards table
CREATE TABLE IF NOT EXISTS public.vocabulary_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  luxembourgish_word TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on vocabulary_cards
ALTER TABLE public.vocabulary_cards ENABLE ROW LEVEL SECURITY;

-- Vocabulary cards RLS policies
CREATE POLICY "vocabulary_select_own" ON public.vocabulary_cards 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vocabulary_insert_own" ON public.vocabulary_cards 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vocabulary_update_own" ON public.vocabulary_cards 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "vocabulary_delete_own" ON public.vocabulary_cards 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_vocabulary_cards_user_id ON public.vocabulary_cards(user_id);
