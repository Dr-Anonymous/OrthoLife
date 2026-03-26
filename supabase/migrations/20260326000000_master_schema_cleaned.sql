-- SQUASHED MASTER SCHEMA (PUBLIC ONLY)
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- Name: in_patient_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.in_patient_status AS ENUM (
    'admitted',
    'discharged'
);


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: add_doctor_with_hospital(jsonb, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_doctor_with_hospital(p_name jsonb, p_phone text, p_password text, p_specialization jsonb DEFAULT '{"en": ""}'::jsonb, p_hospital_name text DEFAULT 'OrthoLife'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_consultant_id uuid;
BEGIN
    INSERT INTO public.consultants (name, phone, password, specialization, is_active, is_admin)
    VALUES (p_name, p_phone, p_password, p_specialization, true, false)
    RETURNING id INTO v_consultant_id;

    INSERT INTO public.hospitals (name, logo_url, lat, lng, consultant_id, settings)
    VALUES (
        p_hospital_name, 
        '/images/logos/logo.png', 
        16.983641275999, 
        82.2527018110795, 
        v_consultant_id, 
        '{"op_fees": 400, "consultant_cut": 400, "free_visit_duration_days": 14}'::jsonb
    );

    RETURN jsonb_build_object('success', true, 'consultant_id', v_consultant_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: create_guide_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_guide_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_post_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_post_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_post_translation_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_post_translation_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_translation_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_translation_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slug(title text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  slug text;
BEGIN
  -- 1. Lowercase the whole string
  slug := lower(title);
  
  -- 2. Replace everything that isn't a word character (alphanumeric including Unicode) with a hyphen
  -- In Postgres, \w matches letters and digits across many languages.
  -- But since we want to be safe with Telugu and English:
  -- We replace most punctuation and whitespace with hyphens.
  slug := regexp_replace(slug, '[^a-z0-9\u0C00-\u0C7F]+', '-', 'g');
  
  -- 3. Trim hyphens from both ends
  slug := trim(both '-' from slug);
  
  -- 4. Collapse multiple hyphens into one
  slug := regexp_replace(slug, '-+', '-', 'g');
  
  -- Fallback if we somehow end up empty
  IF slug = '' OR slug IS NULL THEN
    slug := 'content';
  END IF;
  
  RETURN slug;
END;
$$;


--
-- Name: get_linked_patient_ids(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_linked_patient_ids(p_id text) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    root_id text;
    ids text[];
BEGIN
    -- 1. Find the root primary ID
    -- If the patient has a primary_patient_id, recursively find the top-level parent.
    -- For simplicity, assuming depth 1 or we just traverse up.
    -- Actually, let's just grab the immediate parent. If we enforce "Star Topology" (all duplicates point to one master), 
    -- then we just need to check if current has a parent.
    
    SELECT COALESCE(primary_patient_id, id) INTO root_id
    FROM public.patients
    WHERE id = p_id;

    -- If the found root also has a primary_patient_id (chain), we should resolve it? 
    -- For now, let's assume one-level depth is maintained by the link function.
    -- To be safe, we can loop, but let's stick to the Star Topology enforcement in link_patients.

    -- 2. Get all patients in this cluster (Rotation: Root + All children of Root)
    SELECT array_agg(id) INTO ids
    FROM public.patients
    WHERE id = root_id OR primary_patient_id = root_id;

    RETURN ids;
END;
$$;


--
-- Name: get_public_consent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_consent(consent_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: increment_patient_counter(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_patient_counter(input_date_key text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_counter integer;
BEGIN
    INSERT INTO daily_patient_counters (date_key, counter)
    VALUES (input_date_key, 1)
    ON CONFLICT (date_key)
    DO UPDATE SET counter = daily_patient_counters.counter + 1
    RETURNING counter INTO new_counter;

    RETURN new_counter;
END;
$$;


--
-- Name: link_patients(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_patients(primary_id text, secondary_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_primary_of_secondary text;
BEGIN
    -- Prevent self-linking
    IF primary_id = secondary_id THEN
        RAISE EXCEPTION 'Cannot link patient to themselves';
    END IF;

    -- Check if secondary_id is already a primary for others? 
    -- If so, re-parent those children to the new primary_id.
    UPDATE public.patients
    SET primary_patient_id = primary_id
    WHERE primary_patient_id = secondary_id;

    -- Set secondary's primary to primary_id
    UPDATE public.patients
    SET primary_patient_id = primary_id
    WHERE id = secondary_id;

    -- Ensure the primary_id itself does not have a parent (it should be a root)
    -- If primary_id is actually a child of someone else, we should point secondary to that "Real Master".
    -- But for simplicity, let's assume the UI passes a "Master" patient. 
END;
$$;


--
-- Name: search_consultations(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) RETURNS jsonb
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
                c.referred_by
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
            'consultations', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', mc.id,
                    'status', mc.status,
                    'consultation_data', mc.consultation_data,
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    dob date,
    sex text,
    phone text NOT NULL,
    drive_id text,
    is_dob_estimated boolean DEFAULT true,
    primary_patient_id text,
    secondary_phone text,
    occupation text,
    blood_group text
);


--
-- Name: search_patients_normalized(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_patients_normalized(search_term text) RETURNS SETOF public.patients
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: submit_public_consent(uuid, text, text, character varying, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_public_consent(p_consent_id uuid, p_patient_signature text, p_selfie_url text, p_otp character varying, p_guardian_name text DEFAULT NULL::text, p_is_minor boolean DEFAULT false) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_routes_on_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_routes_on_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  SUPABASE_PROJECT_URL text := 'https://vqskeanwpnvuyxorymib.supabase.co';
  SERVICE_ROLE_KEY text;
begin
  -- Retrieve the service role key from the vault
  select decrypted_secret into SERVICE_ROLE_KEY from vault.decrypted_secrets where name = 'supabase_service_role';

  if SERVICE_ROLE_KEY is null then
    raise exception 'Service role key not found in vault. Please add it with the name "supabase_service_role"';
  end if;

  -- Don't wait for the function to complete
  PERFORM net.http_post(
    url:= SUPABASE_PROJECT_URL || '/functions/v1/update-routes',
    headers:= jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || SERVICE_ROLE_KEY
    ),
    body:='{}'::jsonb
  );
  return new;
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    path text NOT NULL,
    details jsonb,
    user_phone text,
    user_name text
);


--
-- Name: analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.analytics ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: autofill_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autofill_keywords (
    id bigint NOT NULL,
    keywords text[] NOT NULL,
    medication_ids integer[] NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    advice text,
    advice_te text,
    investigations text,
    followup text,
    followup_te text,
    consultant_id uuid
);


--
-- Name: autofill_keywords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.autofill_keywords ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.autofill_keywords_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: consultants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    name jsonb NOT NULL,
    qualifications jsonb,
    specialization jsonb,
    email text,
    photo_url text,
    sign_url text,
    seal_url text,
    bio jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    services jsonb DEFAULT '[]'::jsonb,
    is_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    experience jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    password text DEFAULT '123456'::text
);


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_id text,
    status text DEFAULT 'pending'::text,
    consultation_data jsonb,
    visit_type text DEFAULT '''paid''::text'::text,
    location text,
    language text,
    duration integer DEFAULT 0,
    procedure_fee numeric,
    procedure_consultant_cut numeric,
    referred_by text,
    referral_amount numeric,
    consultant_id uuid DEFAULT 'fdeaf68e-251c-4ffc-a7c1-6bc574657729'::uuid,
    next_review_date date
);


--
-- Name: COLUMN consultations.procedure_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consultations.procedure_fee IS 'Fee charged for the procedure performed during consultation';


--
-- Name: COLUMN consultations.procedure_consultant_cut; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consultations.procedure_consultant_cut IS 'Share of the procedure fee for the consultant';


--
-- Name: COLUMN consultations.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consultations.referred_by IS 'Name of the person who referred this patient';


--
-- Name: COLUMN consultations.referral_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consultations.referral_amount IS 'Amount payable to the referrer';


--
-- Name: daily_patient_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_patient_counters (
    date_key text NOT NULL,
    counter integer NOT NULL
);


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    question_key text NOT NULL,
    answer_key text NOT NULL,
    category_id bigint
);


--
-- Name: faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faqs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;


--
-- Name: google_reviews_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_reviews_cache (
    place_id text NOT NULL,
    reviews_data jsonb NOT NULL,
    cached_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: guide_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guide_translations (
    id bigint NOT NULL,
    guide_id bigint NOT NULL,
    language text NOT NULL,
    title text,
    description text,
    content text,
    next_steps text,
    slug text NOT NULL
);


--
-- Name: guide_translations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guide_translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guide_translations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guide_translations_id_seq OWNED BY public.guide_translations.id;


--
-- Name: guides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guides (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated timestamp with time zone,
    title text NOT NULL,
    description text,
    content text,
    cover_image_url text,
    pages integer,
    estimated_time text,
    category_id bigint,
    next_steps text,
    slug text NOT NULL
);


--
-- Name: guides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guides_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guides_id_seq OWNED BY public.guides.id;


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text NOT NULL,
    address text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    consultant_id uuid
);


--
-- Name: in_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.in_patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_id text NOT NULL,
    admission_date timestamp with time zone DEFAULT now() NOT NULL,
    discharge_date timestamp with time zone,
    diagnosis text,
    procedure text,
    procedure_date timestamp with time zone,
    status public.in_patient_status DEFAULT 'admitted'::public.in_patient_status,
    room_number text,
    discharge_summary jsonb,
    emergency_contact text,
    language text DEFAULT 'en'::text,
    total_bill numeric DEFAULT 0,
    consultant_cut numeric DEFAULT 0,
    referred_by text,
    referral_amount numeric DEFAULT 0,
    payment_mode text,
    consultant_id uuid
);


--
-- Name: COLUMN in_patients.total_bill; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_patients.total_bill IS 'Total bill amount for the admission';


--
-- Name: COLUMN in_patients.consultant_cut; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_patients.consultant_cut IS 'Consultant share of the total bill';


--
-- Name: COLUMN in_patients.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_patients.referred_by IS 'Name of the referrer';


--
-- Name: COLUMN in_patients.referral_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_patients.referral_amount IS 'Amount payable to the referrer';


--
-- Name: COLUMN in_patients.payment_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_patients.payment_mode IS 'Payment mode for the admission: Cash, Health Insurance, Govt Insurance, etc.';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    items jsonb NOT NULL,
    total_amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    delivery_info jsonb,
    type text DEFAULT 'pharmacy'::text
);


--
-- Name: patient_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id text NOT NULL,
    related_patient_id text NOT NULL,
    relationship_type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: pharmacy_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_inventory (
    item_id uuid NOT NULL,
    sale_price numeric DEFAULT 0 NOT NULL,
    original_price numeric DEFAULT 0,
    stock integer DEFAULT 0 NOT NULL,
    discount_percentage numeric DEFAULT 0,
    is_individual boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: pharmacy_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    pack_size text,
    prescription_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: post_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_translations (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    language text NOT NULL,
    title text,
    excerpt text,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    next_steps text,
    slug text NOT NULL
);


--
-- Name: post_translations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_translations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text,
    author text,
    image_url text,
    read_time_minutes integer,
    category_id bigint,
    next_steps text,
    slug text NOT NULL
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: referral_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    specialization text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    consultant_id uuid
);


--
-- Name: saved_medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_medications (
    id integer NOT NULL,
    composition text NOT NULL,
    dose text,
    freq_morning boolean DEFAULT false,
    freq_noon boolean DEFAULT false,
    freq_night boolean DEFAULT false,
    duration text,
    instructions text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    frequency text,
    notes text,
    instructions_te text,
    frequency_te text,
    notes_te text,
    duration_te text,
    brand_metadata jsonb DEFAULT '[]'::jsonb
);


--
-- Name: saved_medications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_medications_id_seq OWNED BY public.saved_medications.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    items jsonb NOT NULL,
    frequency text NOT NULL,
    next_run_date date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'pharmacy'::text
);


--
-- Name: surgical_consent_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surgical_consent_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    risks_procedure_te text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    risks_procedure_en text
);


--
-- Name: surgical_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surgical_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    in_patient_id uuid NOT NULL,
    surgery_date timestamp with time zone NOT NULL,
    procedure_name text NOT NULL,
    risks_general text,
    risks_anesthesia text,
    risks_procedure text,
    doctor_id text,
    patient_phone text NOT NULL,
    patient_signature text,
    doctor_signature text,
    witness_signature text,
    selfie_url text,
    consent_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_at timestamp with time zone,
    consent_language character varying(10) DEFAULT 'en'::character varying,
    guardian_name text,
    is_minor boolean DEFAULT false,
    CONSTRAINT surgical_consents_consent_status_check CHECK ((consent_status = ANY (ARRAY['pending'::text, 'signed'::text])))
);


--
-- Name: text_shortcuts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.text_shortcuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shortcut text NOT NULL,
    expansion text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    consultant_id uuid
);


--
-- Name: TABLE text_shortcuts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.text_shortcuts IS 'Stores user-defined text expansion shortcuts.';


--
-- Name: COLUMN text_shortcuts.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.text_shortcuts.id IS 'The unique identifier for the shortcut.';


--
-- Name: COLUMN text_shortcuts.shortcut; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.text_shortcuts.shortcut IS 'The short text to be replaced (e.g., "ra").';


--
-- Name: COLUMN text_shortcuts.expansion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.text_shortcuts.expansion IS 'The full text to replace the shortcut (e.g., "Rheumatoid Arthritis").';


--
-- Name: COLUMN text_shortcuts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.text_shortcuts.created_at IS 'The timestamp when the shortcut was created.';


--
-- Name: translation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translation_cache (
    id bigint NOT NULL,
    source_text text NOT NULL,
    source_language text NOT NULL,
    target_language text NOT NULL,
    translated_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: translation_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.translation_cache ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.translation_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: faqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);


--
-- Name: guide_translations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_translations ALTER COLUMN id SET DEFAULT nextval('public.guide_translations_id_seq'::regclass);


--
-- Name: guides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides ALTER COLUMN id SET DEFAULT nextval('public.guides_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: saved_medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_medications ALTER COLUMN id SET DEFAULT nextval('public.saved_medications_id_seq'::regclass);


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: autofill_keywords autofill_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autofill_keywords
    ADD CONSTRAINT autofill_keywords_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: consultants consultants_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultants
    ADD CONSTRAINT consultants_phone_key UNIQUE (phone);


--
-- Name: consultants consultants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultants
    ADD CONSTRAINT consultants_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_key UNIQUE (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: daily_patient_counters daily_patient_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_patient_counters
    ADD CONSTRAINT daily_patient_counters_pkey PRIMARY KEY (date_key);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: google_reviews_cache google_reviews_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_reviews_cache
    ADD CONSTRAINT google_reviews_cache_pkey PRIMARY KEY (place_id);


--
-- Name: guide_translations guide_translations_guide_id_language_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_language_key UNIQUE (guide_id, language);


--
-- Name: guide_translations guide_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_pkey PRIMARY KEY (id);


--
-- Name: guide_translations guide_translations_slug_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_slug_lang_key UNIQUE (slug, language);


--
-- Name: guides guides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_pkey PRIMARY KEY (id);


--
-- Name: guides guides_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_slug_key UNIQUE (slug);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: in_patients in_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_patients
    ADD CONSTRAINT in_patients_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: patient_relationships patient_relationships_patient_id_related_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_relationships
    ADD CONSTRAINT patient_relationships_patient_id_related_patient_id_key UNIQUE (patient_id, related_patient_id);


--
-- Name: patient_relationships patient_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_relationships
    ADD CONSTRAINT patient_relationships_pkey PRIMARY KEY (id);


--
-- Name: patients patients_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_id_key UNIQUE (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: pharmacy_inventory pharmacy_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_inventory
    ADD CONSTRAINT pharmacy_inventory_pkey PRIMARY KEY (item_id);


--
-- Name: pharmacy_items pharmacy_items_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_items
    ADD CONSTRAINT pharmacy_items_name_key UNIQUE (name);


--
-- Name: pharmacy_items pharmacy_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_items
    ADD CONSTRAINT pharmacy_items_pkey PRIMARY KEY (id);


--
-- Name: post_translations post_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_pkey PRIMARY KEY (id);


--
-- Name: post_translations post_translations_post_id_language_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_post_id_language_key UNIQUE (post_id, language);


--
-- Name: post_translations post_translations_slug_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_slug_lang_key UNIQUE (slug, language);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: posts posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);


--
-- Name: referral_doctors referral_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_doctors
    ADD CONSTRAINT referral_doctors_pkey PRIMARY KEY (id);


--
-- Name: saved_medications saved_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_medications
    ADD CONSTRAINT saved_medications_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: surgical_consent_templates surgical_consent_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_consent_templates
    ADD CONSTRAINT surgical_consent_templates_pkey PRIMARY KEY (id);


--
-- Name: surgical_consents surgical_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_consents
    ADD CONSTRAINT surgical_consents_pkey PRIMARY KEY (id);


--
-- Name: text_shortcuts text_shortcuts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_shortcuts
    ADD CONSTRAINT text_shortcuts_pkey PRIMARY KEY (id);


--
-- Name: text_shortcuts text_shortcuts_shortcut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_shortcuts
    ADD CONSTRAINT text_shortcuts_shortcut_key UNIQUE (shortcut);


--
-- Name: translation_cache translation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translation_cache
    ADD CONSTRAINT translation_cache_pkey PRIMARY KEY (id);


--
-- Name: translation_cache translation_cache_source_text_source_language_target_langua_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translation_cache
    ADD CONSTRAINT translation_cache_source_text_source_language_target_langua_key UNIQUE (source_text, source_language, target_language);


--
-- Name: idx_consultations_next_review_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_next_review_date ON public.consultations USING btree (next_review_date);


--
-- Name: idx_google_reviews_cache_place_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_reviews_cache_place_id ON public.google_reviews_cache USING btree (place_id);


--
-- Name: idx_patients_primary_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_primary_patient_id ON public.patients USING btree (primary_patient_id);


--
-- Name: idx_pharmacy_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pharmacy_items_category ON public.pharmacy_items USING btree (category);


--
-- Name: idx_pharmacy_items_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pharmacy_items_name ON public.pharmacy_items USING btree (name);


--
-- Name: idx_translation_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translation_cache_lookup ON public.translation_cache USING btree (source_text, source_language, target_language);


--
-- Name: guides on_guide_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_guide_change AFTER INSERT OR DELETE OR UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();


--
-- Name: guide_translations on_guide_translation_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_guide_translation_change AFTER INSERT OR DELETE OR UPDATE ON public.guide_translations FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();


--
-- Name: posts on_post_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_post_change AFTER INSERT OR DELETE OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();


--
-- Name: post_translations on_post_translation_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_post_translation_change AFTER INSERT OR DELETE OR UPDATE ON public.post_translations FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();


--
-- Name: guides trigger_create_guide_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_guide_slug BEFORE INSERT OR UPDATE OF title ON public.guides FOR EACH ROW EXECUTE FUNCTION public.create_guide_slug();


--
-- Name: posts trigger_create_post_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_post_slug BEFORE INSERT OR UPDATE OF title ON public.posts FOR EACH ROW EXECUTE FUNCTION public.create_post_slug();


--
-- Name: post_translations trigger_create_post_translation_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_post_translation_slug BEFORE INSERT OR UPDATE OF title ON public.post_translations FOR EACH ROW EXECUTE FUNCTION public.create_post_translation_slug();


--
-- Name: guide_translations trigger_create_translation_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_translation_slug BEFORE INSERT OR UPDATE OF title ON public.guide_translations FOR EACH ROW EXECUTE FUNCTION public.create_translation_slug();


--
-- Name: in_patients update_in_patients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_in_patients_updated_at BEFORE UPDATE ON public.in_patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: saved_medications update_saved_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_saved_medications_updated_at BEFORE UPDATE ON public.saved_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
-- Name: autofill_keywords autofill_keywords_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autofill_keywords
    ADD CONSTRAINT autofill_keywords_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: consultations consultations_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: consultations consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: faqs faqs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: guide_translations guide_translations_guide_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE;


--
-- Name: guides guides_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: hospitals hospitals_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: in_patients in_patients_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_patients
    ADD CONSTRAINT in_patients_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: in_patients in_patients_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_patients
    ADD CONSTRAINT in_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_relationships patient_relationships_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_relationships
    ADD CONSTRAINT patient_relationships_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_relationships patient_relationships_related_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_relationships
    ADD CONSTRAINT patient_relationships_related_patient_id_fkey FOREIGN KEY (related_patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patients patients_primary_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_primary_patient_id_fkey FOREIGN KEY (primary_patient_id) REFERENCES public.patients(id);


--
-- Name: pharmacy_inventory pharmacy_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_inventory
    ADD CONSTRAINT pharmacy_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pharmacy_items(id) ON DELETE CASCADE;


--
-- Name: post_translations post_translations_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: posts posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: referral_doctors referral_doctors_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_doctors
    ADD CONSTRAINT referral_doctors_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: surgical_consents surgical_consents_in_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_consents
    ADD CONSTRAINT surgical_consents_in_patient_id_fkey FOREIGN KEY (in_patient_id) REFERENCES public.in_patients(id) ON DELETE CASCADE;


--
-- Name: text_shortcuts text_shortcuts_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_shortcuts
    ADD CONSTRAINT text_shortcuts_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.consultants(id);


--
-- Name: faqs Admins can delete faqs.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete faqs." ON public.faqs FOR DELETE USING (true);


--
-- Name: faqs Admins can insert faqs.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert faqs." ON public.faqs FOR INSERT WITH CHECK (true);


--
-- Name: faqs Admins can update faqs.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update faqs." ON public.faqs FOR UPDATE USING (true);


--
-- Name: autofill_keywords Allow all access to authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to authenticated users" ON public.autofill_keywords TO authenticated USING (true) WITH CHECK (true);


--
-- Name: consultations Allow anon users to manage their data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon users to manage their data" ON public.consultations TO anon USING (true);


--
-- Name: patients Allow anon users to manage their data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon users to manage their data" ON public.patients TO anon USING (true);


--
-- Name: posts Allow anonymous delete on posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous delete on posts" ON public.posts FOR DELETE TO anon USING (true);


--
-- Name: categories Allow anonymous insert on categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous insert on categories" ON public.categories FOR INSERT TO anon WITH CHECK (true);


--
-- Name: posts Allow anonymous insert on posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous insert on posts" ON public.posts FOR INSERT TO anon WITH CHECK (true);


--
-- Name: posts Allow anonymous update on posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous update on posts" ON public.posts FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: saved_medications Allow anonymous users to delete saved medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous users to delete saved medications" ON public.saved_medications FOR DELETE TO anon USING (true);


--
-- Name: saved_medications Allow anonymous users to insert saved medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous users to insert saved medications" ON public.saved_medications FOR INSERT TO anon WITH CHECK (true);


--
-- Name: saved_medications Allow anonymous users to read saved medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous users to read saved medications" ON public.saved_medications FOR SELECT TO anon USING (true);


--
-- Name: saved_medications Allow anonymous users to update saved medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous users to update saved medications" ON public.saved_medications FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: in_patients Allow public access for app functionality; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access for app functionality" ON public.in_patients USING (true);


--
-- Name: surgical_consent_templates Allow public access to templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access to templates" ON public.surgical_consent_templates USING (true) WITH CHECK (true);


--
-- Name: pharmacy_items Allow public delete access to pharmacy_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete access to pharmacy_items" ON public.pharmacy_items FOR DELETE USING (true);


--
-- Name: pharmacy_inventory Allow public insert access to pharmacy_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert access to pharmacy_inventory" ON public.pharmacy_inventory FOR INSERT WITH CHECK (true);


--
-- Name: pharmacy_items Allow public insert access to pharmacy_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert access to pharmacy_items" ON public.pharmacy_items FOR INSERT WITH CHECK (true);


--
-- Name: categories Allow public read access to categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT TO anon USING (true);


--
-- Name: pharmacy_inventory Allow public read access to pharmacy_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to pharmacy_inventory" ON public.pharmacy_inventory FOR SELECT USING (true);


--
-- Name: pharmacy_items Allow public read access to pharmacy_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to pharmacy_items" ON public.pharmacy_items FOR SELECT USING (true);


--
-- Name: posts Allow public read access to posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to posts" ON public.posts FOR SELECT TO anon USING (true);


--
-- Name: pharmacy_inventory Allow public update access to pharmacy_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update access to pharmacy_inventory" ON public.pharmacy_inventory FOR UPDATE USING (true);


--
-- Name: pharmacy_items Allow public update access to pharmacy_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update access to pharmacy_items" ON public.pharmacy_items FOR UPDATE USING (true);


--
-- Name: consultants Consultants are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultants are viewable by everyone" ON public.consultants FOR SELECT USING (true);


--
-- Name: hospitals Consultants can delete their own locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultants can delete their own locations" ON public.hospitals FOR DELETE USING (true);


--
-- Name: hospitals Consultants can insert their own locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultants can insert their own locations" ON public.hospitals FOR INSERT WITH CHECK (true);


--
-- Name: hospitals Consultants can update their own locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultants can update their own locations" ON public.hospitals FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: consultants Consultants can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultants can update their own profile" ON public.consultants FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: patient_relationships Enable delete access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete access for all users" ON public.patient_relationships FOR DELETE USING (true);


--
-- Name: text_shortcuts Enable full access for anon and authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable full access for anon and authenticated users" ON public.text_shortcuts USING (true) WITH CHECK (true);


--
-- Name: patient_relationships Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.patient_relationships FOR INSERT WITH CHECK (true);


--
-- Name: referral_doctors Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.referral_doctors FOR INSERT WITH CHECK (true);


--
-- Name: analytics Enable insert for anonymous users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for anonymous users" ON public.analytics FOR INSERT TO anon WITH CHECK (true);


--
-- Name: hospitals Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.hospitals FOR SELECT USING (true);


--
-- Name: patient_relationships Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.patient_relationships FOR SELECT USING (true);


--
-- Name: referral_doctors Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.referral_doctors FOR SELECT USING (true);


--
-- Name: analytics Enable read access for anonymous users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for anonymous users" ON public.analytics FOR SELECT TO anon USING (true);


--
-- Name: surgical_consents Enable read/write for public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read/write for public" ON public.surgical_consents USING (true) WITH CHECK (true);


--
-- Name: guide_translations Guide translations are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guide translations are viewable by everyone." ON public.guide_translations FOR SELECT USING (true);


--
-- Name: hospitals Hospitals are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospitals are viewable by everyone" ON public.hospitals FOR SELECT USING (true);


--
-- Name: faqs Public faqs are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public faqs are viewable by everyone." ON public.faqs FOR SELECT USING (true);


--
-- Name: guides Public guides are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public guides are viewable by everyone." ON public.guides FOR SELECT USING (true);


--
-- Name: guides Users can delete their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own guides." ON public.guides FOR DELETE USING (true);


--
-- Name: guide_translations Users can delete translations for their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete translations for their own guides." ON public.guide_translations FOR DELETE USING (true);


--
-- Name: guides Users can insert their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own guides." ON public.guides FOR INSERT WITH CHECK (true);


--
-- Name: guide_translations Users can insert translations for their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert translations for their own guides." ON public.guide_translations FOR INSERT WITH CHECK (true);


--
-- Name: guides Users can update their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own guides." ON public.guides FOR UPDATE USING (true);


--
-- Name: guide_translations Users can update translations for their own guides.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update translations for their own guides." ON public.guide_translations FOR UPDATE USING (true);


--
-- Name: analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: consultants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: guide_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guide_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: guides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

--
-- Name: hospitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

--
-- Name: in_patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.in_patients ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacy_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacy_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_medications ENABLE ROW LEVEL SECURITY;

--
-- Name: surgical_consent_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.surgical_consent_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: surgical_consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.surgical_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: text_shortcuts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.text_shortcuts ENABLE ROW LEVEL SECURITY;

--
CREATE POLICY "Allow anonymous upload on post_images" ON storage.objects FOR INSERT TO anon WITH CHECK ((bucket_id = 'post_images'::text));
CREATE POLICY "Allow public read access on post_images" ON storage.objects FOR SELECT TO anon USING ((bucket_id = 'post_images'::text));
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ((bucket_id = 'consent-evidence'::text));
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'consent-evidence'::text));
-- Name: supabase_realtime consultations; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.consultations;


--
-- Name: supabase_realtime patients; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.patients;


--
