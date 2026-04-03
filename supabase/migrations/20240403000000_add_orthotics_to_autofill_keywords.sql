ALTER TABLE public.autofill_keywords 
ADD COLUMN IF NOT EXISTS orthotics text,
ADD COLUMN IF NOT EXISTS orthotics_te text;
