-- Add financial columns to in_patients table
ALTER TABLE in_patients
ADD COLUMN IF NOT EXISTS total_bill numeric,
ADD COLUMN IF NOT EXISTS consultant_cut numeric,
ADD COLUMN IF NOT EXISTS referred_by text,
ADD COLUMN IF NOT EXISTS referral_amount numeric;

-- Add financial columns to consultations table
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS procedure_fee numeric,
ADD COLUMN IF NOT EXISTS procedure_consultant_cut numeric,
ADD COLUMN IF NOT EXISTS referred_by text,
ADD COLUMN IF NOT EXISTS referral_amount numeric;

-- Comments for documentation
COMMENT ON COLUMN in_patients.total_bill IS 'Total bill amount for the admission';
COMMENT ON COLUMN in_patients.consultant_cut IS 'Consultant share of the total bill';
COMMENT ON COLUMN in_patients.referred_by IS 'Name of the referrer';
COMMENT ON COLUMN in_patients.referral_amount IS 'Amount payable to the referrer';

COMMENT ON COLUMN consultations.procedure_fee IS 'Fee charged for the procedure performed during consultation';
COMMENT ON COLUMN consultations.procedure_consultant_cut IS 'Share of the procedure fee for the consultant';
COMMENT ON COLUMN consultations.referred_by IS 'Name of the person who referred this patient';
COMMENT ON COLUMN consultations.referral_amount IS 'Amount payable to the referrer';
