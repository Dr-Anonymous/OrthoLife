-- Add secondary_phone column if it doesn't exist
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS secondary_phone text;

-- Update search_consultations to include secondary_phone and referred_by keyword search
CREATE OR REPLACE FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN (
        WITH matching_consultations AS (
            SELECT
                c.id,
                c.status,
                c.consultation_data,
                c.created_at,
                c.patient_id,
                c.location,
                c.visit_type
            FROM consultations c
            INNER JOIN patients p ON c.patient_id = p.id
            WHERE
                -- Normalized name search
                (p_name IS NULL OR regexp_replace(p.name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g') || '%') AND
                -- Phone search now checks secondary_phone too
                (p_phone IS NULL OR 
                 p.phone LIKE '%' || right(p_phone, 10) OR 
                 p.secondary_phone LIKE '%' || right(p_phone, 10)) AND
                -- Keyword search now explicitly checks referred_by field in consultation_data
                (p_keyword IS NULL OR 
                 COALESCE(c.consultation_data::text, '') ILIKE '%' || p_keyword || '%' OR
                 COALESCE(c.consultation_data->>'referred_by', '') ILIKE '%' || p_keyword || '%')
            ORDER BY c.created_at DESC
        )
        SELECT jsonb_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'dob', p.dob,
            'sex', p.sex,
            'phone', p.phone,
            'secondary_phone', p.secondary_phone,
            'drive_id', p.drive_id,
            'consultations', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', mc.id,
                    'status', mc.status,
                    'consultation_data', mc.consultation_data,
                    'created_at', mc.created_at,
                    'location', mc.location,
                    'visit_type', mc.visit_type
                ))
                FROM matching_consultations mc
                WHERE mc.patient_id = p.id
            )
        ))
        FROM patients p
        WHERE p.id IN (SELECT DISTINCT patient_id FROM matching_consultations)
    );
END;
$function$;

-- Update search_patients_normalized to include secondary_phone
CREATE OR REPLACE FUNCTION public.search_patients_normalized(search_term text)
 RETURNS SETOF patients
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    *
  FROM
    patients
  WHERE
    -- Normalized name search
    regexp_replace(name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_term, '[^a-zA-Z0-9]', '', 'g') || '%'
    OR
    -- Search by phone OR secondary_phone
    phone ILIKE '%' || search_term || '%'
    OR
    secondary_phone ILIKE '%' || search_term || '%';
END;
$function$;
