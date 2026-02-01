-- Add consent_language column to surgical_consents
alter table surgical_consents 
add column if not exists consent_language varchar(10) default 'en';

-- Update the RPC to include consent_language
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
    sc.consent_language,
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
