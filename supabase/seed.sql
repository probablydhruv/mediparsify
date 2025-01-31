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

-- Set up storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('temp_pdfs', 'temp_pdfs', true, 52428800, '{application/pdf,image/jpeg,image/png}');

-- Set up RLS policies
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

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
BEGIN;
  -- Policy to allow public read access to files
  INSERT INTO storage.policies (name, definition, bucket_id)
  VALUES (
    'Public Read Access',
    '{"statement": {"effect": "allow", "actions": ["select"], "principal": {"id": "*"}, "resource": ["temp_pdfs/*"]}}',
    'temp_pdfs'
  );

  -- Policy to allow authenticated uploads
  INSERT INTO storage.policies (name, definition, bucket_id)
  VALUES (
    'Allow Uploads',
    '{"statement": {"effect": "allow", "actions": ["insert"], "principal": {"id": "*"}, "resource": ["temp_pdfs/*"]}}',
    'temp_pdfs'
  );
END;