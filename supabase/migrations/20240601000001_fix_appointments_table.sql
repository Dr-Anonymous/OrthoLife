
-- Ensure appointments table exists with correct schema
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_address TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_end TIMESTAMPTZ NOT NULL,
  service_type TEXT NOT NULL,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'online',
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed',
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_email ON appointments(patient_email);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage appointments
CREATE POLICY IF NOT EXISTS "Service role can manage appointments" ON appointments
  FOR ALL USING (auth.role() = 'service_role');
