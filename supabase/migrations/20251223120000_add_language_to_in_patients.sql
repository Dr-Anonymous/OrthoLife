
-- Migration: Add language column to in_patients
-- Description: Stores the preferred language for the discharge summary (e.g., 'en', 'te').
-- Defaults to 'en'.

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_patients' 
        AND column_name = 'language'
    ) THEN
        ALTER TABLE public.in_patients ADD COLUMN language text DEFAULT 'en';
    END IF;
END $$;
