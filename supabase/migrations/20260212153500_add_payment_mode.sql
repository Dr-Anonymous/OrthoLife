-- Add payment_mode column to in_patients table
ALTER TABLE in_patients 
ADD COLUMN payment_mode text;

-- Add comment to explain possible values
COMMENT ON COLUMN in_patients.payment_mode IS 'Payment mode for the admission: Cash, Health Insurance, Govt Insurance, etc.';
