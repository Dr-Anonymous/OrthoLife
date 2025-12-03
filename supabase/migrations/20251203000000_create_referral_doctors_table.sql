-- Create referral_doctors table
CREATE TABLE IF NOT EXISTS referral_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialization TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referral_doctors ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (open to all)
CREATE POLICY "Enable read access for all users" ON referral_doctors
  FOR SELECT
  TO public
  USING (true);

-- Create policy for insert access (open to all)
CREATE POLICY "Enable insert access for all users" ON referral_doctors
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Insert example data
INSERT INTO referral_doctors (name, specialization, address)
VALUES ('Dr Raja Amarendra', 'Nephrologist', 'Akanksh kidney & Children care [Ground floor, Anand Theater, 2-34-11, Chinta Vari St, Bhanugudi Junction, Perrajupeta, Kakinada]');
