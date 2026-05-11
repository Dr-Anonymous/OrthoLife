-- Backfill radiology_findings and radiology_images from consultation_data JSONB to top-level columns
-- This ensures that consultations created before the column promotion still have their data visible.

UPDATE consultations
SET radiology_findings = consultation_data->>'radiology_findings'
WHERE (radiology_findings IS NULL OR radiology_findings = '')
  AND consultation_data->>'radiology_findings' IS NOT NULL;

UPDATE consultations
SET radiology_images = (consultation_data->'radiology_images')
WHERE (radiology_images IS NULL OR radiology_images = '[]'::jsonb)
  AND consultation_data->'radiology_images' IS NOT NULL;
