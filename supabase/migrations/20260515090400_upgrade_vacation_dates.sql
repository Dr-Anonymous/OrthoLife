-- Upgrade vacation_start and vacation_end from date to timestamptz
ALTER TABLE public.consultants 
  ALTER COLUMN vacation_start TYPE TIMESTAMPTZ USING vacation_start::TIMESTAMPTZ,
  ALTER COLUMN vacation_end TYPE TIMESTAMPTZ USING vacation_end::TIMESTAMPTZ;

COMMENT ON COLUMN public.consultants.vacation_start IS 'Vacation start timestamp (inclusive)';
COMMENT ON COLUMN public.consultants.vacation_end IS 'Vacation end timestamp (inclusive)';
