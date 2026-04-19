-- Create patient_health_logs table for time-series vitals tracking
CREATE TABLE IF NOT EXISTS public.patient_health_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    phone TEXT NOT NULL,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL, -- 'bp', 'sugar', 'temp', 'pain', 'bmi', 'recovery'
    value_data JSONB NOT NULL,
    notes TEXT
);

-- RLS Policies
ALTER TABLE public.patient_health_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public trackers need this, identifying by phone/authenticated session)
-- We use a policy that allows both anon and authenticated to insert
-- since trackers are accessible to both logged-in and soon-to-be-logged-in patients.
CREATE POLICY "Allow public log submission" ON public.patient_health_logs 
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow both anon and authenticated users to read logs
-- Doctors read via authenticated, patients read their own via phone in URL/session
CREATE POLICY "Allow public and authenticated read" ON public.patient_health_logs 
FOR SELECT TO anon, authenticated
USING (true);

-- Indexes for performance on growing time-series data
CREATE INDEX IF NOT EXISTS idx_patient_health_logs_phone ON public.patient_health_logs(phone);
CREATE INDEX IF NOT EXISTS idx_patient_health_logs_log_type ON public.patient_health_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_patient_health_logs_created_at ON public.patient_health_logs(created_at DESC);
