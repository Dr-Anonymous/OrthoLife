-- Phase 5: Performance Optimization - Write-Time Parsing
-- Adding investigations_parsed and parser_version to consultations table

ALTER TABLE consultations 
  ADD COLUMN IF NOT EXISTS investigations_parsed jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_version integer DEFAULT 0;

-- Create GIN index for deep search capability
CREATE INDEX IF NOT EXISTS idx_consultations_investigations_parsed ON consultations USING GIN (investigations_parsed);

COMMENT ON COLUMN consultations.investigations_parsed IS 'Cached output of ClinicalParser for lab investigations.';
COMMENT ON COLUMN consultations.parser_version IS 'Version of the parser used to generate investigations_parsed. 0 means unparsed, >=1 means parsed.';
