-- Migration: Add consultant_id to hospitals table to scope locations
-- Date: 2026-03-27

ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);

-- Backfill existing hospitals with the default consultant
DO $$
DECLARE
    default_id uuid;
BEGIN
    SELECT id INTO default_id FROM public.consultants WHERE phone = '9866812555' LIMIT 1;
    IF default_id IS NOT NULL THEN
        UPDATE public.hospitals SET consultant_id = default_id WHERE consultant_id IS NULL;
    END IF;
END $$;
