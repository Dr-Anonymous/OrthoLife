-- Migration: Add password to consultants
-- Date: 2026-03-30

ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS password text DEFAULT '123456';

-- Backfill existing consultants with default password if null
UPDATE public.consultants SET password = '123456' WHERE password IS NULL;
