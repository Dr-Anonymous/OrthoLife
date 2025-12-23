-- Create a function to search patients with normalized names (ignoring special characters)
CREATE OR REPLACE FUNCTION search_patients_normalized(search_term text)
RETURNS SETOF patients
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    *
  FROM
    patients
  WHERE
    -- Normalize both the stored name and the search term by removing non-alphanumeric characters
    regexp_replace(name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_term, '[^a-zA-Z0-9]', '', 'g') || '%'
    OR
    -- Also search by phone number
    phone ILIKE '%' || search_term || '%';
END;
$$;
