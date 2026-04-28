-- Add location column to in_patients table
ALTER TABLE in_patients ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'OrthoLife';

-- Comment: This column tracks the hospital branch where the patient was admitted.
-- Defaulting to 'OrthoLife' ensures backward compatibility with existing records.
