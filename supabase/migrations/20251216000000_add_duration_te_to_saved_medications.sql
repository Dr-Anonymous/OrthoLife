-- Add duration_te column to saved_medications table
ALTER TABLE saved_medications
ADD COLUMN IF NOT EXISTS duration_te TEXT;

-- Update 'days' -> 'రోజులు'
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'days?', 'రోజులు', 'gi') 
WHERE duration ~* 'days?';

-- Update 'weeks' -> 'వారాలు'
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'weeks', 'వారాలు', 'gi') 
WHERE duration ~* 'weeks';

-- Update 'week' -> 'వారం' (singular, ensuring we don't mess up previously replaced weeks if any logic fails, but order helps)
-- Note: 'weeks' replace above handles the plural. This handles '1 week'.
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'week', 'వారం', 'gi') 
WHERE duration ~* '\yweek\y' AND duration_te IS NULL; 
-- Actually, simple overwrite for the singular case is safer if we just look for '1 week' pattern specifically to override if needed, 
-- or just run this on rows that haven't been translated yet or specifically match 'week' but not 'weeks'.
-- Postgres regex replace is powerful.
-- Let's stick to the specific requirements:
-- 10 days -> 10 రోజులు
-- 2 weeks -> 2 వారాలు
-- 1 week -> 1 వారం

-- Reset for clean slate application or just apply updates logic:

-- 1. Handle "weeks" (plural)
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'weeks', 'వారాలు', 'gi') 
WHERE duration ~* 'weeks';

-- 2. Handle "week" (singular)
-- Only replace 'week' if it wasn't 'weeks' (which is now 'వారాలు'). 
-- Or easier: just match 'week' followed by word boundary?
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'week', 'వారం', 'gi') 
WHERE duration ~* '\yweek\y' AND (duration_te IS NULL OR duration_te = '' OR duration_te = duration); 
-- If previous update didn't touch it, or if we are overwriting. 
-- Actually, if I run the 'week' update on rows that have 'weeks', it won't match '\yweek\y' if 's' is there? 
-- 'week' matches inside 'weeks'. '\yweek\y' matches ' week '. 'weeks' would be ' weeks '.
-- So '\yweek\y' is safe for singular.

-- 3. Handle "days" or "day" -> "రోజులు"
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'days?', 'రోజులు', 'gi') 
WHERE duration ~* 'days?';

-- 4. Handle "months" (plural)
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'months', 'నెలలు', 'gi') 
WHERE duration ~* 'months';

-- 5. Handle "month" (singular)
UPDATE saved_medications 
SET duration_te = REGEXP_REPLACE(duration, 'month', 'నెల', 'gi') 
WHERE duration ~* '\ymonth\y' AND (duration_te IS NULL OR duration_te = '' OR duration_te = duration);


