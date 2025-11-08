-- Create the text_shortcuts table
CREATE TABLE public.text_shortcuts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    shortcut text NOT NULL,
    expansion text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT text_shortcuts_pkey PRIMARY KEY (id),
    CONSTRAINT text_shortcuts_shortcut_key UNIQUE (shortcut)
);

-- Add comments to the table and columns
COMMENT ON TABLE public.text_shortcuts IS 'Stores user-defined text expansion shortcuts.';
COMMENT ON COLUMN public.text_shortcuts.id IS 'The unique identifier for the shortcut.';
COMMENT ON COLUMN public.text_shortcuts.shortcut IS 'The short text to be replaced (e.g., "ra").';
COMMENT ON COLUMN public.text_shortcuts.expansion IS 'The full text to replace the shortcut (e.g., "Rheumatoid Arthritis").';
COMMENT ON COLUMN public.text_shortcuts.created_at IS 'The timestamp when the shortcut was created.';


-- Enable Row Level Security
ALTER TABLE public.text_shortcuts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access
-- This policy allows anyone (including anonymous users) to perform any action.
-- This is suitable for a single-user application where these shortcuts are global.
CREATE POLICY "Enable full access for anon and authenticated users"
ON public.text_shortcuts
FOR ALL
USING (true)
WITH CHECK (true);
