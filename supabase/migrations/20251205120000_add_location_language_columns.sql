-- Add location and language columns to consultations table
ALTER TABLE consultations 
ADD COLUMN location text,
ADD COLUMN language text;

-- Backfill existing data from the JSON column
-- We include visit_type here as well to ensure it is populated if the previous migration's backfill was skipped.
UPDATE consultations 
SET 
  location = consultation_data->>'location',
  language = consultation_data->>'language',
  visit_type = COALESCE(consultation_data->>'visit_type', visit_type)
WHERE 
  consultation_data IS NOT NULL;
