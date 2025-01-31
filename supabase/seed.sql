-- Reset tables
DROP TABLE IF EXISTS public.uploaded_files;

-- Create tables
CREATE TABLE public.uploaded_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text NOT NULL,
    file_path text NOT NULL,
    content_type text NOT NULL,
    size bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up storage (only if bucket doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'temp_pdfs'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('temp_pdfs', 'temp_pdfs', true, 52428800, '{application/pdf,image/jpeg,image/png}');
    END IF;
END $$;

-- Set up RLS policies
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON public.uploaded_files;
DROP POLICY IF EXISTS "Allow public read access" ON public.uploaded_files;

CREATE POLICY "Allow public insert" ON public.uploaded_files
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.uploaded_files
    FOR SELECT TO anon
    USING (true);

-- Add primary key constraint
ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);

-- Set up storage bucket policies
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;

CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'temp_pdfs');

CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'temp_pdfs');
