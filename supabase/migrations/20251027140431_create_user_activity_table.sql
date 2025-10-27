CREATE TABLE public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_phone TEXT,
  page_visited TEXT
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert their own activity"
ON public.user_activity
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service_role to have full access"
ON public.user_activity
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
