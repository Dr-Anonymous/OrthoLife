
-- Create surgical_consents table
CREATE TABLE IF NOT EXISTS public.surgical_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    in_patient_id uuid REFERENCES public.in_patients(id) ON DELETE CASCADE NOT NULL,
    surgery_date timestamp with time zone NOT NULL,
    procedure_name text NOT NULL,
    risks_general text,
    risks_anesthesia text,
    risks_procedure text,
    doctor_id text, -- ID of the doctor (could be text name or uuid if we had a doctors table, keeping text as per plan/existing patterns often use text names or auth ids)
    patient_phone text NOT NULL,
    patient_signature text, -- Base64
    doctor_signature text, -- Base64
    witness_signature text, -- Base64
    selfie_url text,
    consent_status text DEFAULT 'pending' CHECK (consent_status IN ('pending', 'signed')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_at timestamp with time zone
);

-- RLS for surgical_consents
ALTER TABLE public.surgical_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for public" ON public.surgical_consents
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Storage Bucket for Consent Evidence
-- Attempt to create bucket if not exists (Standard Supabase Storage way via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('consent-evidence', 'consent-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'consent-evidence' );

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'consent-evidence' );
