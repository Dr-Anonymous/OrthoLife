-- Step 1: Add slug column to guides table
ALTER TABLE public.guides ADD COLUMN slug text;

-- Step 2: Create a function to convert titles to slugs (handling basic unicode for Telugu if needed, or fallback)
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

-- Step 3: Populate slugs for existing guides
UPDATE public.guides
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Step 4: Ensure slugs are unique (if there are duplicates, we need to handle them, but assuming titles are unique enough for now)
-- You may need to manually resolve duplicates if this constraint fails
ALTER TABLE public.guides ADD CONSTRAINT guides_slug_key UNIQUE (slug);

-- Step 5: Make slug required for future guides
ALTER TABLE public.guides ALTER COLUMN slug SET NOT NULL;

-- Step 6: Create a trigger to automatically generate slug on insert or update if not provided
CREATE OR REPLACE FUNCTION create_guide_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_guide_slug
  BEFORE INSERT OR UPDATE OF title ON public.guides
  FOR EACH ROW
  EXECUTE FUNCTION create_guide_slug();

-- Step 7: Add slug to guide_translations
ALTER TABLE public.guide_translations ADD COLUMN slug text;

-- Step 8: Populate slugs for existing guide translations
UPDATE public.guide_translations
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Step 9: Make slug required and unique per language
ALTER TABLE public.guide_translations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.guide_translations ADD CONSTRAINT guide_translations_slug_lang_key UNIQUE (slug, language);

-- Step 10: Trigger for translations
CREATE OR REPLACE FUNCTION create_translation_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_translation_slug
  BEFORE INSERT OR UPDATE OF title ON public.guide_translations
  FOR EACH ROW
  EXECUTE FUNCTION create_translation_slug();
