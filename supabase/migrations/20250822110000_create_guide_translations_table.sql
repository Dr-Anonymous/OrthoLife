CREATE TABLE guide_translations (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,
    UNIQUE (guide_id, language)
);

-- RLS Policies for guide_translations
ALTER TABLE guide_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide translations are viewable by everyone."
ON guide_translations FOR SELECT
USING (true);

CREATE POLICY "Users can insert translations for their own guides."
ON guide_translations FOR INSERT
WITH CHECK (true); -- In a real app, you'd check if the user owns the guide

CREATE POLICY "Users can update translations for their own guides."
ON guide_translations FOR UPDATE
USING (true); -- In a real app, you'd check if the user owns the guide

CREATE POLICY "Users can delete translations for their own guides."
ON guide_translations FOR DELETE
USING (true); -- In a real app, you'd check if the user owns the guide
