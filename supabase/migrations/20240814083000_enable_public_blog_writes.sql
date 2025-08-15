-- Enable RLS for the tables if it's not already enabled.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure this script is re-runnable.
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to posts" ON public.posts;
DROP POLICY IF EXISTS "Allow anonymous insert on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow anonymous update on posts" ON public.posts;

-- Create policies for the 'categories' table
CREATE POLICY "Allow public read access to categories"
ON public.categories
FOR SELECT
TO anon
USING (true);

-- Create policies for the 'posts' table
CREATE POLICY "Allow public read access to posts"
ON public.posts
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert on posts"
ON public.posts
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous update on posts"
ON public.posts
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
