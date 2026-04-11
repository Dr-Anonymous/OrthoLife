-- Add allergies column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;

-- Migrate existing data from consultations.consultation_data->>'allergy'
-- We take the most recent non-empty allergy from any consultation for that patient
WITH latest_allergies AS (
  SELECT DISTINCT ON (patient_id) 
    patient_id, 
    consultation_data->>'allergy' as allergy_val
  FROM consultations
  WHERE consultation_data->'allergy' IS NOT NULL 
    AND consultation_data->>'allergy' != ''
  ORDER BY patient_id, created_at DESC
)
UPDATE patients
SET allergies = latest_allergies.allergy_val
FROM latest_allergies
WHERE patients.id = latest_allergies.patient_id
AND (patients.allergies IS NULL OR patients.allergies = '');
