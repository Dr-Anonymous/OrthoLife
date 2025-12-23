
-- Migration: Create in_patients table
-- Description: Table to manage in-patient admissions, surgeries and status.
-- Updated: Added Room No, Emergency Contact. Changed Discharge Summary to JSONB.

-- Create enum for in-patient status
DO $$ BEGIN
    CREATE TYPE in_patient_status AS ENUM ('admitted', 'discharged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.in_patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    patient_id text REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    admission_date timestamptz NOT NULL DEFAULT now(),
    discharge_date timestamptz,
    
    -- Clinical Details
    diagnosis text,
    procedure text,
    procedure_date timestamptz,
    status in_patient_status DEFAULT 'admitted'::in_patient_status,
    
    -- New Fields for V2
    room_number text,
    discharge_summary jsonb, -- Changed to JSONB
    emergency_contact text
);

-- Safely migrate existing column if it exists as text
DO $$ 
BEGIN 
    -- Check if column exists and is text
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_patients' 
        AND column_name = 'discharge_summary' 
        AND data_type = 'text'
    ) THEN
        -- Convert text to jsonb (wrapping text in a simple object to avoid parsing errors if raw text)
        -- Or just casting if we assume it's empty. Let's act safe:
        -- If it has content, we put it in "clinical_notes" of the json structure.
        ALTER TABLE public.in_patients 
        ALTER COLUMN discharge_summary TYPE jsonb 
        USING jsonb_build_object('clinical_notes', discharge_summary);
    END IF;

    -- Ensure column exists if it didn't (e.g. if table existed but column didn't)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_patients' 
        AND column_name = 'discharge_summary'
    ) THEN
        ALTER TABLE public.in_patients ADD COLUMN discharge_summary jsonb;
    END IF;

    -- Update Room Number if missing
     IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_patients' 
        AND column_name = 'room_number'
    ) THEN
        ALTER TABLE public.in_patients ADD COLUMN room_number text;
    END IF;

     -- Update Emergency Contact if missing
     IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_patients' 
        AND column_name = 'emergency_contact'
    ) THEN
        ALTER TABLE public.in_patients ADD COLUMN emergency_contact text;
    END IF;
END $$;


-- Enable RLS
ALTER TABLE public.in_patients ENABLE ROW LEVEL SECURITY;

-- Policies
-- NOTE: Since the app uses Firebase Auth and not Supabase Auth, requests come as 'anon'.
-- We allow public access for now. In a stricter setup, we would implement custom claims or edge functions.
DO $$ BEGIN
    CREATE POLICY "Allow public access for app functionality" ON public.in_patients
        FOR ALL TO public USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_in_patients_updated_at ON public.in_patients;
CREATE TRIGGER update_in_patients_updated_at
    BEFORE UPDATE ON public.in_patients
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
