-- Create OT Notes Templates table
CREATE TABLE IF NOT EXISTS public.ot_notes_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ot_notes_templates ENABLE ROW LEVEL SECURITY;

-- Setup Policies
CREATE POLICY "Enable read access for all users" ON public.ot_notes_templates FOR SELECT USING (true);
CREATE POLICY "Enable ALL actions for authenticated users" ON public.ot_notes_templates FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ot_notes_templates_updated_at
    BEFORE UPDATE ON public.ot_notes_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
