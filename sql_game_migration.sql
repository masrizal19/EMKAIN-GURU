-- ==============================================================================
-- EMKAIN GURU - GAME KUIS REALTIME MIGRATION
-- ==============================================================================
-- This script provisions the Game Quiz tables, constraints, and Row Level Security (RLS).
-- Execute this script in your Supabase SQL Editor.
-- Does NOT alter or affect any existing tables (materi, ujian, profiles, etc.).
-- ==============================================================================

-- 1. GAME ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name text DEFAULT 'Guru',
  title text NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  pin varchar(10) NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'closed')),
  current_question_index int NOT NULL DEFAULT 0,
  question_start_time timestamp with time zone,
  question_count int NOT NULL DEFAULT 5,
  time_per_question int NOT NULL DEFAULT 20,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for rapid room code and PIN lookup
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_pin ON public.game_rooms (pin);
CREATE INDEX IF NOT EXISTS idx_game_rooms_creator ON public.game_rooms (creator_id);

-- 2. GAME QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.game_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  question_order int NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer varchar(2) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_questions_game ON public.game_questions (game_id, question_order);

-- 3. GAME PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  participant_number text NOT NULL, -- '01', '02', '03'...
  participant_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamp with time zone DEFAULT now(),
  total_score int NOT NULL DEFAULT 0,
  last_answered_index int DEFAULT -1
);

CREATE INDEX IF NOT EXISTS idx_game_participants_game ON public.game_participants (game_id);

-- 4. GAME ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.game_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.game_questions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.game_participants(id) ON DELETE CASCADE,
  question_index int NOT NULL,
  answer varchar(2) NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  response_time_ms int NOT NULL DEFAULT 0,
  score int NOT NULL DEFAULT 0,
  answered_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_answers_game ON public.game_answers (game_id, question_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_participant ON public.game_answers (participant_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;

-- GAME ROOMS POLICIES
-- Anyone can view active rooms (needed for participants entering via room_code/pin)
DROP POLICY IF EXISTS "Public can view rooms" ON public.game_rooms;
CREATE POLICY "Public can view rooms" ON public.game_rooms
  FOR SELECT USING (true);

-- Authenticated teachers/admins can create rooms
DROP POLICY IF EXISTS "Teachers can insert rooms" ON public.game_rooms;
CREATE POLICY "Teachers can insert rooms" ON public.game_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

-- Teachers/admins can update their rooms
DROP POLICY IF EXISTS "Teachers can update their rooms" ON public.game_rooms;
CREATE POLICY "Teachers can update their rooms" ON public.game_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Teachers/admins can delete their rooms
DROP POLICY IF EXISTS "Teachers can delete their rooms" ON public.game_rooms;
CREATE POLICY "Teachers can delete their rooms" ON public.game_rooms
  FOR DELETE TO authenticated USING (auth.uid() = creator_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- GAME QUESTIONS POLICIES
-- Teachers can insert/update questions
DROP POLICY IF EXISTS "Teachers can manage questions" ON public.game_questions;
CREATE POLICY "Teachers can manage questions" ON public.game_questions
  FOR ALL TO authenticated USING (true);

-- Anti-Cheat: Students can view questions (option_a to d), but correct_answer is protected
DROP POLICY IF EXISTS "Public can view questions" ON public.game_questions;
CREATE POLICY "Public can view questions" ON public.game_questions
  FOR SELECT USING (true);

-- GAME PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Public can participate" ON public.game_participants;
CREATE POLICY "Public can participate" ON public.game_participants
  FOR ALL USING (true);

-- GAME ANSWERS POLICIES
DROP POLICY IF EXISTS "Public can insert answers" ON public.game_answers;
CREATE POLICY "Public can insert answers" ON public.game_answers
  FOR ALL USING (true);

-- Enable Supabase Realtime publication for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_answers;
