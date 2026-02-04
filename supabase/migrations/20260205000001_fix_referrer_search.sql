-- Ensure usage of referred_by column
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS referred_by text;

-- Force replace the search_consultations function to ensure latest logic is applied
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
                c.visit_type,
                c.referred_by
            FROM consultations c
            INNER JOIN patients p ON c.patient_id = p.id
            WHERE
                -- Name search (normalized)
                (p_name IS NULL OR p.name ILIKE '%' || p_name || '%' OR regexp_replace(p.name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g') || '%') AND
                
                -- Phone search (primary OR secondary)
                (p_phone IS NULL OR 
                 p.phone LIKE '%' || right(p_phone, 10) || '%' OR 
                 p.secondary_phone LIKE '%' || right(p_phone, 10) || '%') AND
                
                -- Keyword search (Consultation Data OR Referred By specific check)
                (p_keyword IS NULL OR 
                 -- General JSON text search (covers most fields)
                 COALESCE(c.consultation_data::text, '') ILIKE '%' || p_keyword || '%' OR
                 -- Specific check for referred_by COLUMN
                 COALESCE(c.referred_by, '') ILIKE '%' || p_keyword || '%')
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
                    'created_at', mc.created_at,
                    'location', mc.location,
                    'visit_type', mc.visit_type,
                    'referred_by', mc.referred_by
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
