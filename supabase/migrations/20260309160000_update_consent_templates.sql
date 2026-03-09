-- Update surgical_consent_templates to support dual languages and save space

-- Step 1: Add new columns
ALTER TABLE public.surgical_consent_templates
ADD COLUMN IF NOT EXISTS risks_procedure_en text;

-- Step 2: Rename existing column
-- Renaming doesn't support IF EXISTS in standard Postgres ALTER TABLE, splitting it
ALTER TABLE public.surgical_consent_templates
RENAME COLUMN risks_procedure TO risks_procedure_te;

-- Step 3: Remove unnecessary columns
ALTER TABLE public.surgical_consent_templates
DROP COLUMN IF EXISTS language;

ALTER TABLE public.surgical_consent_templates
DROP COLUMN IF EXISTS risks_general;

ALTER TABLE public.surgical_consent_templates
DROP COLUMN IF EXISTS risks_anesthesia;

-- Step 3: Update existing surgical consents that have default risks
-- We will handle this gracefully at the application level just in case, but let's nullify exact matches if any to save space immediately.
-- However, running exact HTML matches in SQL is tricky due to formatting/whitespace differences.
-- It's safer to only nullify them going forward via the application layer, ensuring we don't accidentally wipe custom risks.
