-- Update search_consultations RPC to include promoted columns while preserving patient metadata
CREATE OR REPLACE FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    normalized_phone text;
    legacy_phone text;
BEGIN
    normalized_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
    legacy_phone := CASE
        WHEN length(normalized_phone) > 10 THEN right(normalized_phone, 10)
        ELSE normalized_phone
    END;

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
                c.referred_by,
                c.consultant_id,
                c.investigations,
                c.radiology_findings,
                c.radiology_images
            FROM consultations c
            INNER JOIN patients p ON c.patient_id = p.id
            WHERE
                (p_name IS NULL
                 OR p.name ILIKE '%' || p_name || '%'
                 OR regexp_replace(p.name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g') || '%') AND
                (
                    p_phone IS NULL
                    OR normalized_phone = ''
                    OR p.phone LIKE '%' || normalized_phone || '%'
                    OR p.secondary_phone LIKE '%' || normalized_phone || '%'
                    OR (
                        legacy_phone <> normalized_phone
                        AND (
                            p.phone LIKE '%' || legacy_phone || '%'
                            OR p.secondary_phone LIKE '%' || legacy_phone || '%'
                        )
                    )
                ) AND
                (
                    p_keyword IS NULL
                    OR COALESCE(c.consultation_data::text, '') ILIKE '%' || p_keyword || '%'
                    OR COALESCE(c.referred_by, '') ILIKE '%' || p_keyword || '%'
                    OR COALESCE(c.investigations, '') ILIKE '%' || p_keyword || '%'
                    OR COALESCE(c.radiology_findings, '') ILIKE '%' || p_keyword || '%'
                    OR COALESCE(p.occupation, '') ILIKE '%' || p_keyword || '%'
                    OR COALESCE(p.hometown, '') ILIKE '%' || p_keyword || '%'
                )
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
            'occupation', p.occupation,
            'blood_group', p.blood_group,
            'hometown', p.hometown,
            'consultations', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', mc.id,
                    'status', mc.status,
                    'consultation_data', mc.consultation_data,
                    'created_at', mc.created_at,
                    'location', mc.location,
                    'visit_type', mc.visit_type,
                    'referred_by', mc.referred_by,
                    'consultant_id', mc.consultant_id,
                    'investigations', mc.investigations,
                    'radiology_findings', mc.radiology_findings,
                    'radiology_images', mc.radiology_images
                ))
                FROM matching_consultations mc
                WHERE mc.patient_id = p.id
            )
        ))
        FROM patients p
        WHERE p.id IN (SELECT DISTINCT patient_id FROM matching_consultations)
    );
END;
$$;
