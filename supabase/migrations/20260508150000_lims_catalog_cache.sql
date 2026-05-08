CREATE TABLE IF NOT EXISTS lims_catalog_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL, -- 'service' or 'range'
    external_id TEXT NOT NULL,
    data JSONB NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(item_type, external_id)
);

-- Add index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_lims_catalog_cache_type ON lims_catalog_cache(item_type);

-- Enable RLS
ALTER TABLE lims_catalog_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (including anon for shareable links)
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON lims_catalog_cache;
CREATE POLICY "Allow read access to all users" 
ON lims_catalog_cache FOR SELECT 
TO authenticated, anon 
USING (true);
