
-- Add next_review_date column to consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Index for performance when querying future reviews
CREATE INDEX IF NOT EXISTS idx_consultations_next_review_date ON consultations(next_review_date);

-- SQL Script to backfill next_review_date for existing consultations
-- This script parses the 'followup' field from consultation_data and populates next_review_date.

WITH follow_up_durations AS (
  SELECT 
    id,
    created_at,
    consultation_data->>'followup' as followup_text,
    -- Extract numeric portion and unit
    substring(consultation_data->>'followup' FROM '(\d+)') as num_part,
    CASE 
      WHEN consultation_data->>'followup' ~* '(year|years|సంవత్సరం|సంవత్సరాలు|సంవత్సరాల)' THEN 'years'
      WHEN consultation_data->>'followup' ~* '(month|months|నెల|నెలలు|నెలల)' THEN 'months'
      WHEN consultation_data->>'followup' ~* '(week|weeks|వారం|వారాలు|వారాల)' THEN 'weeks'
      WHEN consultation_data->>'followup' ~* '(day|days|రోజు|రోజులు|రోజుల)' THEN 'days'
      ELSE NULL
    END as unit
  FROM consultations
  WHERE next_review_date IS NULL 
    AND consultation_data->>'followup' IS NOT NULL
    AND consultation_data->>'followup' <> ''
)
UPDATE consultations
SET next_review_date = (
  CASE 
    WHEN unit = 'days' THEN (consultations.created_at + (COALESCE(num_part, '1')::int * interval '1 day'))::date
    WHEN unit = 'weeks' THEN (consultations.created_at + (COALESCE(num_part, '1')::int * interval '1 week'))::date
    WHEN unit = 'months' THEN (consultations.created_at + (COALESCE(num_part, '1')::int * interval '1 month'))::date
    WHEN unit = 'years' THEN (consultations.created_at + (COALESCE(num_part, '1')::int * interval '1 year'))::date
  END
)
FROM follow_up_durations
WHERE consultations.id = follow_up_durations.id
  AND follow_up_durations.unit IS NOT NULL;

