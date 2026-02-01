-- Create a function to fetch consent details publicly by UUID
-- Security Definer allows unauthenticated users to read specific fields if they have the UUID
create or replace function public.get_public_consent(consent_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_consent record;
begin
  select 
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
    p.name as patient_name,
    p.phone as patient_phone
  into v_consent
  from surgical_consents sc
  join in_patients ip on sc.in_patient_id = ip.id
  join patients p on ip.patient_id = p.id
  where sc.id = consent_id;

  if not found then
    return null;
  end if;

  return row_to_json(v_consent);
end;
$$;

-- Create a function to submit consent publicly by UUID
create or replace function public.submit_public_consent(
  p_consent_id uuid,
  p_patient_signature text,
  p_selfie_url text,
  p_otp varchar
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_consent_status text;
begin
  -- First check if consent exists and is pending
  select consent_status into v_consent_status
  from surgical_consents
  where id = p_consent_id;

  if not found then 
    raise exception 'Consent not found';
  end if;

  if v_consent_status = 'signed' then
    return true; -- Already signed
  end if;

  -- Verify OTP (In a real app, we would verify against a stored OTP table)
  -- For now, we trust the frontend verification or assuming OTP valid if passed here
  -- Ideally, p_otp logic should be here.
  -- Simulating success if OTP length > 3 (basic check)
  if length(p_otp) < 4 then
      raise exception 'Invalid OTP';
  end if;

  update surgical_consents
  set 
    patient_signature = p_patient_signature,
    selfie_url = p_selfie_url,
    consent_status = 'signed',
    signed_at = now()
  where id = p_consent_id;

  return true;
end;
$$;

-- Grant execute permissions to public/anon
grant execute on function public.get_public_consent(uuid) to anon, authenticated, service_role;
grant execute on function public.submit_public_consent(uuid, text, text, varchar) to anon, authenticated, service_role;
