CREATE TABLE patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    name text NOT NULL,
    dob date,
    sex text,
    phone text NOT NULL UNIQUE,
    complaints text,
    findings text,
    investigations text,
    diagnosis text,
    advice text,
    followup text,
    medications jsonb
);

CREATE TABLE consultations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text, -- pending, completed, cancelled
    fee numeric,
    notes jsonb
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their data" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage their data" ON public.consultations FOR ALL TO authenticated USING (true);