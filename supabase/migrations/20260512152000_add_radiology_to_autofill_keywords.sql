-- Add radiology_findings column to autofill_keywords table
ALTER TABLE public.autofill_keywords 
ADD COLUMN IF NOT EXISTS radiology_findings text;
