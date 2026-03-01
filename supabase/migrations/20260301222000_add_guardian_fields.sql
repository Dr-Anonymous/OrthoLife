-- Add guardian fields to surgical_consents
ALTER TABLE public.surgical_consents 
ADD COLUMN IF NOT EXISTS guardian_name text,
ADD COLUMN IF NOT EXISTS is_minor boolean DEFAULT false;

-- Update get_public_consent to return DOB and guardian fields
CREATE OR REPLACE FUNCTION public.get_public_consent(consent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consent RECORD;
BEGIN
  SELECT 
    sc.id,
    sc.procedure_name,
    sc.surgery_date,
    sc.risks_general,
    sc.risks_anesthesia,
    sc.risks_procedure,
    sc.consent_status,
    sc.patient_signature,
    sc.doctor_signature,
    sc.signed_at,
    sc.selfie_url,
    sc.consent_language,
    sc.guardian_name,
    sc.is_minor,
    p.name AS patient_name,
    p.phone AS patient_phone,
    p.dob AS patient_dob
  INTO v_consent
  FROM surgical_consents sc
  JOIN in_patients ip ON sc.in_patient_id = ip.id
  JOIN patients p ON ip.patient_id = p.id
  WHERE sc.id = consent_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(v_consent);
END;
$$;

-- Update submit_public_consent to accept guardian fields
CREATE OR REPLACE FUNCTION public.submit_public_consent(
  p_consent_id uuid,
  p_patient_signature text,
  p_selfie_url text,
  p_otp varchar,
  p_guardian_name text DEFAULT NULL,
  p_is_minor boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consent_status text;
BEGIN
  -- First check if consent exists and is pending
  SELECT consent_status INTO v_consent_status
  FROM surgical_consents
  WHERE id = p_consent_id;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Consent not found';
  END IF;

  IF v_consent_status = 'signed' THEN
    return true; -- Already signed
  END IF;

  -- Verify OTP
  IF length(p_otp) < 4 then
      raise exception 'Invalid OTP';
  END IF;

  UPDATE surgical_consents
  SET 
    patient_signature = p_patient_signature,
    selfie_url = p_selfie_url,
    guardian_name = p_guardian_name,
    is_minor = p_is_minor,
    consent_status = 'signed',
    signed_at = now()
  WHERE id = p_consent_id;

  RETURN true;
END;
$$;
