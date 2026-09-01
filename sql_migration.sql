-- Unified materi_files table for Materi, RPM, and Ujian files
CREATE TABLE IF NOT EXISTS public.materi_files (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  class_level text not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  category text not null,
  uploaded_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.materi_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert materi_files" ON public.materi_files;
CREATE POLICY "Authenticated users can insert materi_files" ON public.materi_files 
FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Authenticated users can read materi_files" ON public.materi_files;
CREATE POLICY "Authenticated users can read materi_files" ON public.materi_files 
FOR SELECT USING (auth.role() = 'authenticated');
