-- Create materi_files table
CREATE TABLE IF NOT EXISTS public.materi_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  judul text NOT NULL,
  mata_pelajaran text,
  kelas text,
  jenis_file text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now()
);

-- Create rpm_files table
CREATE TABLE IF NOT EXISTS public.rpm_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  judul text NOT NULL,
  mata_pelajaran text,
  kelas text,
  jenis_file text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now()
);

-- Create ujian_files table
CREATE TABLE IF NOT EXISTS public.ujian_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  judul text NOT NULL,
  mata_pelajaran text,
  kelas text,
  jenis_file text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materi_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpm_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ujian_files ENABLE ROW LEVEL SECURITY;

-- Policies for viewing (authenticated users can view)
CREATE POLICY "Enable read access for all authenticated users on materi_files" ON public.materi_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users on rpm_files" ON public.rpm_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users on ujian_files" ON public.ujian_files FOR SELECT TO authenticated USING (true);

-- Policies for inserting (authenticated users can insert their own)
CREATE POLICY "Enable insert for authenticated users on materi_files" ON public.materi_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users on rpm_files" ON public.rpm_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users on ujian_files" ON public.ujian_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage bucket policies (Assuming buckets materi, rpm, ujian exist)
-- Replace 'materi' with your bucket name
CREATE POLICY "Give users authenticated access to folder" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'materi');
CREATE POLICY "Give users authenticated insert to folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materi');
CREATE POLICY "Give users authenticated access to rpm" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'rpm');
CREATE POLICY "Give users authenticated insert to rpm" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rpm');
CREATE POLICY "Give users authenticated access to ujian" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ujian');
CREATE POLICY "Give users authenticated insert to ujian" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ujian');

