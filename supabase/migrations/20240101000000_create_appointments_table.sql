
-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_address TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_end TIMESTAMPTZ NOT NULL,
  service_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policy for appointments (admin access for now)
CREATE POLICY "appointments_admin_access" ON public.appointments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_email ON public.appointments(patient_email);
