CREATE TABLE translation_cache (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    source_text TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_text, source_language, target_language)
);

-- Create an index for faster lookups
CREATE INDEX idx_translation_cache_lookup ON translation_cache(source_text, source_language, target_language);
