CREATE TABLE saved_medications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    dose TEXT,
    freq_morning BOOLEAN DEFAULT FALSE,
    freq_noon BOOLEAN DEFAULT FALSE,
    freq_night BOOLEAN DEFAULT FALSE,
    duration TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE saved_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous users to read saved medications"
ON saved_medications
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous users to insert saved medications"
ON saved_medications
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update saved medications"
ON saved_medications
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete saved medications"
ON saved_medications
FOR DELETE
TO anon
USING (true);

-- Function and Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_medications_updated_at
BEFORE UPDATE ON saved_medications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
