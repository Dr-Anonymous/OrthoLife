
CREATE TABLE public.hospitals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT NOT NULL,
    address TEXT,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb, -- modular config: { op_fees: 0, free_visit_duration_days: 14 }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Create Policy for public read access
CREATE POLICY "Enable read access for all users" ON public.hospitals
    FOR SELECT
    USING (true);

-- Insert initial data
INSERT INTO public.hospitals (name, logo_url, lat, lng, settings) VALUES
    ('Badam', '/images/logos/badam-logo.png', 16.983919058575893, 82.24253810923248, '{"op_fees": 50, "free_visit_duration_days": 7}'),
    ('OrthoLife', '/images/logos/logo.png', 16.983641275998988, 82.25270181107953, '{"op_fees": 400, "free_visit_duration_days": 14}'),
    ('Laxmi', '/images/logos/laxmi.png', 16.97258563624306, 82.24836799729827, '{"op_fees": 350, "free_visit_duration_days": 14}')
ON CONFLICT (name) DO NOTHING;
