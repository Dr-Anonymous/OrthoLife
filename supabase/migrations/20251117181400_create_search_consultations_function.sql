CREATE OR REPLACE FUNCTION search_consultations(p_name TEXT, p_phone TEXT, p_keyword TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        WITH matching_consultations AS (
            SELECT
                c.id,
                c.status,
                c.consultation_data,
                c.created_at,
                c.patient_id
            FROM consultations c
            INNER JOIN patients p ON c.patient_id = p.id
            WHERE
                (p_name IS NULL OR p.name ILIKE '%' || p_name || '%') AND
                (p_phone IS NULL OR p.phone LIKE '%' || right(p_phone, 10)) AND
                (p_keyword IS NULL OR COALESCE(c.consultation_data::text, '') ILIKE '%' || p_keyword || '%')
            ORDER BY c.created_at DESC
        )
        SELECT jsonb_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'dob', p.dob,
            'sex', p.sex,
            'phone', p.phone,
            'drive_id', p.drive_id,
            'consultations', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', mc.id,
                    'status', mc.status,
                    'consultation_data', mc.consultation_data,
                    'created_at', mc.created_at
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
