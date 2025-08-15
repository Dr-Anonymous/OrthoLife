CREATE POLICY "Allow anonymous delete on posts"
ON public.posts
FOR DELETE
TO anon
USING (true);
