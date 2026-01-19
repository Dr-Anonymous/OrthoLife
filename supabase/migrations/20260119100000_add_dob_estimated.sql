-- Add is_dob_estimated column to patients table
ALTER TABLE "public"."patients" ADD COLUMN IF NOT EXISTS "is_dob_estimated" boolean DEFAULT TRUE;
