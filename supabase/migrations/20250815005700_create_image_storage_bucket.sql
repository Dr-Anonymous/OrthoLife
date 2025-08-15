-- Create a new bucket for post images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the post_images bucket
-- Allow public read access to all images
CREATE POLICY "Allow public read access on post_images"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'post_images');

-- Allow anonymous users to upload images
CREATE POLICY "Allow anonymous upload on post_images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'post_images');
