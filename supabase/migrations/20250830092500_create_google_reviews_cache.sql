CREATE TABLE google_reviews_cache (
    place_id TEXT PRIMARY KEY,
    reviews_data JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index for faster lookups on place_id
CREATE INDEX idx_google_reviews_cache_place_id ON google_reviews_cache(place_id);
