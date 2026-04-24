-- Add profile layout and team members to consultants table
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS profile_layout text DEFAULT 'single';
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT '[]'::jsonb;

-- Update existing records to have 'single' layout
UPDATE public.consultants SET profile_layout = 'single' WHERE profile_layout IS NULL;
UPDATE public.consultants SET team_members = '[]'::jsonb WHERE team_members IS NULL;
