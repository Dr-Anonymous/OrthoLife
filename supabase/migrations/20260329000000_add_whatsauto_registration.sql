-- Migration: Add is_whatsauto_active to consultants table
ALTER TABLE public.consultants 
ADD COLUMN IF NOT EXISTS is_whatsauto_active BOOLEAN DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN public.consultants.is_whatsauto_active IS 'Flag to identify if this clinician has registered a personal WhatsAuto device for handling WhatsApp messages.';
