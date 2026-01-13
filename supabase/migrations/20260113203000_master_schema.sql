CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

CREATE TYPE public.in_patient_status AS ENUM (
    'admitted',
    'discharged'
);

ALTER TYPE public.in_patient_status OWNER TO postgres;

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

ALTER FUNCTION public.increment_patient_counter(input_date_key text) OWNER TO postgres;

CREATE FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) RETURNS jsonb
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
                c.patient_id,
                c.location,
                c.visit_type
            FROM consultations c
            INNER JOIN patients p ON c.patient_id = p.id
            WHERE
                -- Normalized name search
                (p_name IS NULL OR regexp_replace(p.name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g') || '%') AND
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
$$;

ALTER FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) OWNER TO postgres;

CREATE TABLE public.patients (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    dob date,
    sex text,
    phone text NOT NULL,
    drive_id text
);

ALTER TABLE public.patients OWNER TO postgres;

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
    -- Normalize both the stored name and the search term by removing non-alphanumeric characters
    regexp_replace(name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_term, '[^a-zA-Z0-9]', '', 'g') || '%'
    OR
    -- Also search by phone number
    phone ILIKE '%' || search_term || '%';
END;
$$;

ALTER FUNCTION public.search_patients_normalized(search_term text) OWNER TO postgres;

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

ALTER FUNCTION public.update_routes_on_change() OWNER TO postgres;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

CREATE TABLE public.analytics (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    path text NOT NULL,
    details jsonb,
    user_phone text,
    user_name text
);

ALTER TABLE public.analytics OWNER TO postgres;

ALTER TABLE public.analytics ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.autofill_keywords (
    id bigint NOT NULL,
    keywords text[] NOT NULL,
    medication_ids integer[] NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    advice text,
    advice_te text,
    investigations text,
    followup text,
    followup_te text
);

ALTER TABLE public.autofill_keywords OWNER TO postgres;

ALTER TABLE public.autofill_keywords ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.autofill_keywords_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL
);

ALTER TABLE public.categories OWNER TO postgres;

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;

CREATE TABLE public.consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_id text,
    status text DEFAULT 'pending'::text,
    consultation_data jsonb,
    visit_type text DEFAULT '''paid''::text'::text,
    location text,
    language text,
    duration integer DEFAULT 0
);

ALTER TABLE public.consultations OWNER TO postgres;

CREATE TABLE public.daily_patient_counters (
    date_key text NOT NULL,
    counter integer NOT NULL
);

ALTER TABLE public.daily_patient_counters OWNER TO postgres;

CREATE TABLE public.faqs (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    question_key text NOT NULL,
    answer_key text NOT NULL,
    category_id bigint
);

ALTER TABLE public.faqs OWNER TO postgres;

CREATE SEQUENCE public.faqs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.faqs_id_seq OWNER TO postgres;

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;

CREATE TABLE public.google_reviews_cache (
    place_id text NOT NULL,
    reviews_data jsonb NOT NULL,
    cached_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.google_reviews_cache OWNER TO postgres;

CREATE TABLE public.guide_translations (
    id bigint NOT NULL,
    guide_id bigint NOT NULL,
    language text NOT NULL,
    title text,
    description text,
    content text,
    next_steps text
);

ALTER TABLE public.guide_translations OWNER TO postgres;

CREATE SEQUENCE public.guide_translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.guide_translations_id_seq OWNER TO postgres;

ALTER SEQUENCE public.guide_translations_id_seq OWNED BY public.guide_translations.id;

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
    next_steps text
);

ALTER TABLE public.guides OWNER TO postgres;

CREATE SEQUENCE public.guides_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.guides_id_seq OWNER TO postgres;

ALTER SEQUENCE public.guides_id_seq OWNED BY public.guides.id;

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
    language text DEFAULT 'en'::text
);

ALTER TABLE public.in_patients OWNER TO postgres;

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

ALTER TABLE public.orders OWNER TO postgres;

CREATE TABLE public.pharmacy_inventory (
    item_id uuid NOT NULL,
    sale_price numeric DEFAULT 0 NOT NULL,
    original_price numeric DEFAULT 0,
    stock integer DEFAULT 0 NOT NULL,
    discount_percentage numeric DEFAULT 0,
    is_individual boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pharmacy_inventory OWNER TO postgres;

CREATE TABLE public.pharmacy_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    pack_size text,
    prescription_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pharmacy_items OWNER TO postgres;

CREATE TABLE public.post_translations (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    language text NOT NULL,
    title text,
    excerpt text,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    next_steps text
);

ALTER TABLE public.post_translations OWNER TO postgres;

ALTER TABLE public.post_translations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_translations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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
    next_steps text
);

ALTER TABLE public.posts OWNER TO postgres;

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;

CREATE TABLE public.referral_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    specialization text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.referral_doctors OWNER TO postgres;

CREATE TABLE public.saved_medications (
    id integer NOT NULL,
    name text NOT NULL,
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
    duration_te text
);

ALTER TABLE public.saved_medications OWNER TO postgres;

CREATE SEQUENCE public.saved_medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.saved_medications_id_seq OWNER TO postgres;

ALTER SEQUENCE public.saved_medications_id_seq OWNED BY public.saved_medications.id;

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

ALTER TABLE public.subscriptions OWNER TO postgres;

CREATE TABLE public.text_shortcuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shortcut text NOT NULL,
    expansion text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.text_shortcuts OWNER TO postgres;

CREATE TABLE public.translation_cache (
    id bigint NOT NULL,
    source_text text NOT NULL,
    source_language text NOT NULL,
    target_language text NOT NULL,
    translated_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.translation_cache OWNER TO postgres;

ALTER TABLE public.translation_cache ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.translation_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);

ALTER TABLE ONLY public.guide_translations ALTER COLUMN id SET DEFAULT nextval('public.guide_translations_id_seq'::regclass);

ALTER TABLE ONLY public.guides ALTER COLUMN id SET DEFAULT nextval('public.guides_id_seq'::regclass);

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);

ALTER TABLE ONLY public.saved_medications ALTER COLUMN id SET DEFAULT nextval('public.saved_medications_id_seq'::regclass);

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.autofill_keywords
    ADD CONSTRAINT autofill_keywords_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_key UNIQUE (id);

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.daily_patient_counters
    ADD CONSTRAINT daily_patient_counters_pkey PRIMARY KEY (date_key);

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_reviews_cache
    ADD CONSTRAINT google_reviews_cache_pkey PRIMARY KEY (place_id);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_language_key UNIQUE (guide_id, language);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.in_patients
    ADD CONSTRAINT in_patients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_id_key UNIQUE (id);

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pharmacy_inventory
    ADD CONSTRAINT pharmacy_inventory_pkey PRIMARY KEY (item_id);

ALTER TABLE ONLY public.pharmacy_items
    ADD CONSTRAINT pharmacy_items_name_key UNIQUE (name);

ALTER TABLE ONLY public.pharmacy_items
    ADD CONSTRAINT pharmacy_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_post_id_language_key UNIQUE (post_id, language);

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.referral_doctors
    ADD CONSTRAINT referral_doctors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.saved_medications
    ADD CONSTRAINT saved_medications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.text_shortcuts
    ADD CONSTRAINT text_shortcuts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.text_shortcuts
    ADD CONSTRAINT text_shortcuts_shortcut_key UNIQUE (shortcut);

ALTER TABLE ONLY public.translation_cache
    ADD CONSTRAINT translation_cache_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.translation_cache
    ADD CONSTRAINT translation_cache_source_text_source_language_target_langua_key UNIQUE (source_text, source_language, target_language);

CREATE TRIGGER on_guide_change AFTER INSERT OR DELETE OR UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();

CREATE TRIGGER on_guide_translation_change AFTER INSERT OR DELETE OR UPDATE ON public.guide_translations FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();

CREATE TRIGGER on_post_change AFTER INSERT OR DELETE OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();

CREATE TRIGGER on_post_translation_change AFTER INSERT OR DELETE OR UPDATE ON public.post_translations FOR EACH ROW EXECUTE FUNCTION public.update_routes_on_change();

CREATE TRIGGER update_in_patients_updated_at BEFORE UPDATE ON public.in_patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_medications_updated_at BEFORE UPDATE ON public.saved_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.in_patients
    ADD CONSTRAINT in_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pharmacy_inventory
    ADD CONSTRAINT pharmacy_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pharmacy_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post_translations
    ADD CONSTRAINT post_translations_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.guide_translations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.in_patients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.referral_doctors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.saved_medications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.text_shortcuts ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA auth TO anon;

GRANT USAGE ON SCHEMA auth TO authenticated;

GRANT USAGE ON SCHEMA auth TO service_role;

GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

GRANT ALL ON SCHEMA auth TO dashboard_user;

GRANT USAGE ON SCHEMA auth TO postgres;

GRANT USAGE ON SCHEMA cron TO postgres WITH GRANT OPTION;

GRANT USAGE ON SCHEMA extensions TO anon;

GRANT USAGE ON SCHEMA extensions TO authenticated;

GRANT USAGE ON SCHEMA extensions TO service_role;

GRANT ALL ON SCHEMA extensions TO dashboard_user;

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;

GRANT USAGE ON SCHEMA net TO postgres;

GRANT USAGE ON SCHEMA net TO anon;

GRANT USAGE ON SCHEMA net TO authenticated;

GRANT USAGE ON SCHEMA net TO service_role;

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT USAGE ON SCHEMA realtime TO postgres;

GRANT USAGE ON SCHEMA realtime TO anon;

GRANT USAGE ON SCHEMA realtime TO authenticated;

GRANT USAGE ON SCHEMA realtime TO service_role;

GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;

GRANT ALL ON FUNCTION auth.jwt() TO postgres;

GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;

GRANT ALL ON FUNCTION cron.alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.job_cache_invalidate() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.schedule(schedule text, command text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.schedule(job_name text, schedule text, command text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.unschedule(job_id bigint) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION cron.unschedule(job_name text) TO postgres WITH GRANT OPTION;

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;

GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;

GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;

GRANT ALL ON FUNCTION public.increment_patient_counter(input_date_key text) TO anon;

GRANT ALL ON FUNCTION public.increment_patient_counter(input_date_key text) TO authenticated;

GRANT ALL ON FUNCTION public.increment_patient_counter(input_date_key text) TO service_role;

GRANT ALL ON FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) TO anon;

GRANT ALL ON FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) TO authenticated;

GRANT ALL ON FUNCTION public.search_consultations(p_name text, p_phone text, p_keyword text) TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.patients TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.patients TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.patients TO service_role;

GRANT ALL ON FUNCTION public.search_patients_normalized(search_term text) TO anon;

GRANT ALL ON FUNCTION public.search_patients_normalized(search_term text) TO authenticated;

GRANT ALL ON FUNCTION public.search_patients_normalized(search_term text) TO service_role;

GRANT ALL ON FUNCTION public.update_routes_on_change() TO anon;

GRANT ALL ON FUNCTION public.update_routes_on_change() TO authenticated;

GRANT ALL ON FUNCTION public.update_routes_on_change() TO service_role;

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;

GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;

GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;

GRANT ALL ON FUNCTION realtime.topic() TO postgres;

GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO postgres;

GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO postgres;

GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO postgres;

GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO postgres;

GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;

GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO postgres;

GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO postgres;

GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_authorizations TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_authorizations TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_client_states TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_client_states TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_clients TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_clients TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_consents TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.oauth_consents TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO postgres;

GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO postgres;

GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO postgres;

GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO postgres;

GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO postgres;

GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO postgres;

GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO postgres;

GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO dashboard_user;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO dashboard_user;

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO postgres;

GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;

GRANT SELECT ON TABLE cron.job TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE cron.job_run_details TO postgres WITH GRANT OPTION;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.analytics TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.analytics TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.analytics TO service_role;

GRANT ALL ON SEQUENCE public.analytics_id_seq TO anon;

GRANT ALL ON SEQUENCE public.analytics_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.analytics_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.autofill_keywords TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.autofill_keywords TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.autofill_keywords TO service_role;

GRANT ALL ON SEQUENCE public.autofill_keywords_id_seq TO anon;

GRANT ALL ON SEQUENCE public.autofill_keywords_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.autofill_keywords_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.categories TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.categories TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.categories TO service_role;

GRANT ALL ON SEQUENCE public.categories_id_seq TO anon;

GRANT ALL ON SEQUENCE public.categories_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.categories_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.consultations TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.consultations TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.consultations TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.daily_patient_counters TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.daily_patient_counters TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.daily_patient_counters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.faqs TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.faqs TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.faqs TO service_role;

GRANT ALL ON SEQUENCE public.faqs_id_seq TO anon;

GRANT ALL ON SEQUENCE public.faqs_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.faqs_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.google_reviews_cache TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.google_reviews_cache TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.google_reviews_cache TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guide_translations TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guide_translations TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guide_translations TO service_role;

GRANT ALL ON SEQUENCE public.guide_translations_id_seq TO anon;

GRANT ALL ON SEQUENCE public.guide_translations_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.guide_translations_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guides TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guides TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.guides TO service_role;

GRANT ALL ON SEQUENCE public.guides_id_seq TO anon;

GRANT ALL ON SEQUENCE public.guides_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.guides_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.in_patients TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.in_patients TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.in_patients TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_inventory TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_inventory TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_inventory TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_items TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_items TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pharmacy_items TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.post_translations TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.post_translations TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.post_translations TO service_role;

GRANT ALL ON SEQUENCE public.post_translations_id_seq TO anon;

GRANT ALL ON SEQUENCE public.post_translations_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.post_translations_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO service_role;

GRANT ALL ON SEQUENCE public.posts_id_seq TO anon;

GRANT ALL ON SEQUENCE public.posts_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.posts_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_doctors TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_doctors TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_doctors TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.saved_medications TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.saved_medications TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.saved_medications TO service_role;

GRANT ALL ON SEQUENCE public.saved_medications_id_seq TO anon;

GRANT ALL ON SEQUENCE public.saved_medications_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.saved_medications_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.subscriptions TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.subscriptions TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.subscriptions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.text_shortcuts TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.text_shortcuts TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.text_shortcuts TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translation_cache TO anon;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translation_cache TO authenticated;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translation_cache TO service_role;

GRANT ALL ON SEQUENCE public.translation_cache_id_seq TO anon;

GRANT ALL ON SEQUENCE public.translation_cache_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.translation_cache_id_seq TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO dashboard_user;

GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;

GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;

GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO dashboard_user;

GRANT SELECT ON TABLE realtime.schema_migrations TO anon;

GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;

GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO supabase_realtime_admin;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO postgres;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO dashboard_user;

GRANT SELECT ON TABLE realtime.subscription TO anon;

GRANT SELECT ON TABLE realtime.subscription TO authenticated;

GRANT SELECT ON TABLE realtime.subscription TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO supabase_realtime_admin;

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;

GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;

GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;
