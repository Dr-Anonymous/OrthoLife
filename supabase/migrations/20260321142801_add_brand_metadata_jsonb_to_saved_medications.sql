ALTER TABLE saved_medications ADD COLUMN brand_metadata jsonb DEFAULT '[]'::jsonb;

-- Backfill data to prevent data loss
UPDATE saved_medications
SET brand_metadata = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', b, 'cost', null, 'locations', '[]'::jsonb)), '[]'::jsonb)
    FROM unnest(brands) AS b
)
WHERE brands IS NOT NULL AND array_length(brands, 1) > 0;

ALTER TABLE saved_medications DROP COLUMN IF EXISTS brands;