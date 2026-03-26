-- Migration: Refine Consultant-Scoped Unique Constraints
-- Created at: 2026-03-26 23:00:00

-- 1. Refine Hospitals Unique Constraint
DO $$ 
BEGIN 
    -- Drop existing global unique constraint if it exists
    ALTER TABLE IF EXISTS public.hospitals DROP CONSTRAINT IF EXISTS hospitals_name_key;
    
    -- Add the new composite unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hospitals_consultant_name_key') THEN
        ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_consultant_name_key UNIQUE (consultant_id, name);
    END IF;
END $$;

-- 2. Refine Text Shortcuts Unique Constraint
DO $$ 
BEGIN 
    -- Drop existing global unique constraint if it exists
    ALTER TABLE IF EXISTS public.text_shortcuts DROP CONSTRAINT IF EXISTS text_shortcuts_shortcut_key;
    
    -- Add the new composite unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'text_shortcuts_consultant_shortcut_key') THEN
        ALTER TABLE public.text_shortcuts ADD CONSTRAINT text_shortcuts_consultant_shortcut_key UNIQUE (consultant_id, shortcut);
    END IF;
END $$;

-- 3. Refine Referral Doctors Unique Constraint
DO $$ 
BEGIN 
    -- Referral doctors logic: scoped uniqueness for (consultant_id, name)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_doctors_consultant_name_key') THEN
        ALTER TABLE public.referral_doctors ADD CONSTRAINT referral_doctors_consultant_name_key UNIQUE (consultant_id, name);
    END IF;
END $$;
