-- Improve generate_slug to handle mixed language strings (like Telugu + English)
-- The previous version would treat English as the priority and cut off EVERYTHING else if any English existed.
-- This new version handles them equally by replacing almost all "separator-like" characters and lowercasing consistently.

CREATE OR REPLACE FUNCTION generate_slug(title text)
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Apply to guides
UPDATE public.guides SET slug = generate_slug(title);

-- Apply to guide translations
UPDATE public.guide_translations SET slug = generate_slug(title);

-- Apply to posts
UPDATE public.posts SET slug = generate_slug(title);

-- Apply to post translations
UPDATE public.post_translations SET slug = generate_slug(title);
