ALTER TABLE saved_medications ADD COLUMN brands text[] DEFAULT '{}';

-- Note: Existing rows are mapped 1:1 (the old "brand" name acts as a new generic "composition" name with an empty brands array).
-- 
-- CLINICAL SAFETY WARNING: Aggressively grouping existing records strictly by dosing profile 
-- (e.g., matching "500mg, 1-0-1, 5 days, After Food") is dangerous because different drugs 
-- (like Paracetamol vs Amoxicillin) can share identical dosing profiles.
-- 
-- Therefore, we purposely DO NOT automatically merge existing rows. 
-- You should manually consolidate them via the UI or using targeted scripts where the drug names are verified.
-- 
-- Helper query to identify POTENTIALLY groupable duplicate profiles for manual review:
-- SELECT
--   dose, freq_morning, freq_noon, freq_night, frequency, duration, instructions, notes,
--   array_agg(name) as potential_brands
-- FROM saved_medications
-- GROUP BY dose, freq_morning, freq_noon, freq_night, frequency, duration, instructions, notes
-- HAVING count(*) > 1;