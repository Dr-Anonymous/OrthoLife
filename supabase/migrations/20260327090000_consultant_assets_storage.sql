-- Migration: Setup Consultant Assets Storage
-- Description: Creates the consultant-assets bucket and configures RLS policies 
--              to allow consultants to upload and view their professional assets.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultant-assets', 'consultant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access (SELECT)
-- This allows anyone to view the assets (photo, signature on reports)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Public View Access' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Public View Access" ON storage.objects FOR SELECT USING (bucket_id = 'consultant-assets');
    END IF;
END $$;

-- 3. Allow Consultant Uploads (INSERT)
-- Since consultants use a custom login flow (Gate), they are seen as 'anon' role by Supabase.
-- We allow INSERT for the 'anon' role into the 'consultant-assets' bucket.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Consultant Uploads' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Consultant Uploads" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'consultant-assets');
    END IF;
END $$;

-- 4. Allow Consultant Updates (UPDATE)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Consultant Updates' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Consultant Updates" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'consultant-assets');
    END IF;
END $$;

-- 5. Allow Consultant Deletions (DELETE)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Consultant Deletion' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Consultant Deletion" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'consultant-assets');
    END IF;
END $$;
