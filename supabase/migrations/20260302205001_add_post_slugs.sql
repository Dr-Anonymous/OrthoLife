-- Step 1: Add slug column to posts table
ALTER TABLE public.posts ADD COLUMN slug text;

-- Step 2: Create a function to convert titles to slugs (handling basic unicode for Telugu if needed, or fallback)
-- (We use the one we already created for guides if it exists, but just in case we redefine or rely on it. Let's rely on it, but use IF NOT EXISTS logic or just re-define it with OR REPLACE)
CREATE OR REPLACE FUNCTION generate_slug(title text)
RETURNS text AS $$
DECLARE
  base_slug text;
BEGIN
  -- Replaces any English non-alphanumeric character with a hyphen
  base_slug := lower(trim(both '-' from regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')));
  
  -- Fallback for purely non-English text (like Telugu titles)
  -- Just replace whitespaces with hyphens so we don't end up with an empty slug
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := lower(regexp_replace(trim(title), '\s+', '-', 'g'));
  END IF;
  
  RETURN base_slug;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Populate slugs for existing posts
UPDATE public.posts
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Step 4: Ensure slugs are unique per post
ALTER TABLE public.posts ADD CONSTRAINT posts_slug_key UNIQUE (slug);

-- Step 5: Make slug required for future posts
ALTER TABLE public.posts ALTER COLUMN slug SET NOT NULL;

-- Step 6: Create a trigger to automatically generate slug on insert or update if not provided
CREATE OR REPLACE FUNCTION create_post_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_post_slug
  BEFORE INSERT OR UPDATE OF title ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION create_post_slug();

-- Step 7: Add slug to post_translations
ALTER TABLE public.post_translations ADD COLUMN slug text;

-- Step 8: Populate slugs for existing post translations
UPDATE public.post_translations
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Step 9: Make slug required and unique per language
ALTER TABLE public.post_translations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.post_translations ADD CONSTRAINT post_translations_slug_lang_key UNIQUE (slug, language);

-- Step 10: Trigger for translations
CREATE OR REPLACE FUNCTION create_post_translation_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_post_translation_slug
  BEFORE INSERT OR UPDATE OF title ON public.post_translations
  FOR EACH ROW
  EXECUTE FUNCTION create_post_translation_slug();
