
-- Add reception phone and password fields to consultants table
ALTER TABLE public.consultants 
ADD COLUMN IF NOT EXISTS reception_phone TEXT,
ADD COLUMN IF NOT EXISTS reception_password TEXT DEFAULT '123456';

-- Add comment for documentation
COMMENT ON COLUMN public.consultants.reception_phone IS 'Phone number for receptionist or assistant secondary access.';
COMMENT ON COLUMN public.consultants.reception_password IS 'Password for receptionist or assistant secondary access.';

-- Migration: Add is_legacy_handler to consultants table
ALTER TABLE consultants 
ADD COLUMN IF NOT EXISTS is_legacy_handler BOOLEAN DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN consultants.is_legacy_handler IS 'Flag to identify if this clinician handles clinic-wide (legacy) WhatsApp messages like appointments and diagnostics.';
