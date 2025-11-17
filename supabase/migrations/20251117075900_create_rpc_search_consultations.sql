create or replace function search_consultations(
    name_query text default null,
    phone_query text default null,
    keyword_query text default null
)
returns table (
    consultation_id uuid,
    consultation_created_at timestamptz,
    consultation_status text,
    consultation_data jsonb,
    patient_id uuid,
    patient_name text,
    patient_dob text,
    patient_sex text,
    patient_phone text,
    patient_drive_id text
) as $$
begin
    return query
    select
        c.id as consultation_id,
        c.created_at as consultation_created_at,
        c.status as consultation_status,
        c.consultation_data,
        p.id as patient_id,
        p.name as patient_name,
        p.dob as patient_dob,
        p.sex as patient_sex,
        p.phone as patient_phone,
        p.drive_id as patient_drive_id
    from consultations c
    inner join patients p on c.patient_id = p.id
    where
        (name_query is null or p.name ilike '%' || name_query || '%') and
        (phone_query is null or p.phone like '%' || right(phone_query, 10)) and
        (keyword_query is null or c.consultation_data::text ilike '%' || keyword_query || '%')
    order by p.name, c.created_at desc;
end;
$$ language plpgsql;
