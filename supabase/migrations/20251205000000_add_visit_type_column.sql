-- Add visit_type column to consultations table
ALTER TABLE consultations 
ADD COLUMN visit_type text DEFAULT 'free';

-- Optional: If you want to backfill existing data from the JSON column
-- UPDATE consultations 
-- SET visit_type = consultation_data->>'visit_type' 
-- WHERE consultation_data->>'visit_type' IS NOT NULL;
