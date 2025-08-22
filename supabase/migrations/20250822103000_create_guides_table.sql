CREATE TABLE guides (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    cover_image_url TEXT,
    pages INT,
    estimated_time TEXT,
    difficulty TEXT,
    download_count INT DEFAULT 0,
    category_id BIGINT REFERENCES categories(id)
);

-- Add RLS policies for guides
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public guides are viewable by everyone."
ON guides FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own guides."
ON guides FOR INSERT
WITH CHECK (true); -- In a real app, you'd likely check against auth.uid() = user_id

CREATE POLICY "Users can update their own guides."
ON guides FOR UPDATE
USING (true); -- In a real app, you'd likely check against auth.uid() = user_id

CREATE POLICY "Users can delete their own guides."
ON guides FOR DELETE
USING (true); -- In a real app, you'd likely check against auth.uid() = user_id
