-- Migration: Add consultant_id to in_patients
-- Date: 2026-03-29

ALTER TABLE public.in_patients ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);

-- Backfill existing in_patients with the default consultant
DO $$
DECLARE
    default_id uuid;
BEGIN
    SELECT id INTO default_id FROM public.consultants WHERE phone = '9866812555';
    IF default_id IS NOT NULL THEN
        UPDATE public.in_patients SET consultant_id = default_id WHERE consultant_id IS NULL;
    END IF;
END $$;
