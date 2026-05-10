-- Phase 3: Promote investigations and radiology to top-level columns
ALTER TABLE consultations 
  ADD COLUMN IF NOT EXISTS investigations text,
  ADD COLUMN IF NOT EXISTS radiology_findings text,
  ADD COLUMN IF NOT EXISTS radiology_images jsonb DEFAULT '[]'::jsonb;

-- Non-destructive backfill of existing lab data
UPDATE consultations
SET investigations = consultation_data->>'investigations'
WHERE investigations IS NULL 
  AND consultation_data->>'investigations' IS NOT NULL;

-- Ensure RLS is active on new columns (typically inherited, but good practice)
-- No additional RLS needed if they are just new columns on an existing tracked table.
