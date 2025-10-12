CREATE TABLE patients (
    id text PRIMARY KEY,
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
    patient_id text REFERENCES patients(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text, -- pending, completed, cancelled
    fee numeric,
    notes jsonb
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their data" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage their data" ON public.consultations FOR ALL TO authenticated USING (true);

CREATE TABLE daily_patient_counters (
    date_key text PRIMARY KEY,
    counter integer NOT NULL
);

CREATE OR REPLACE FUNCTION increment_patient_counter(input_date_key text)
RETURNS integer AS $$
DECLARE
    new_counter integer;
BEGIN
    INSERT INTO daily_patient_counters (date_key, counter)
    VALUES (input_date_key, 1)
    ON CONFLICT (date_key)
    DO UPDATE SET counter = daily_patient_counters.counter + 1
    RETURNING counter INTO new_counter;

    RETURN new_counter;
END;
$$ LANGUAGE plpgsql;