-- Add next_steps column to posts table
ALTER TABLE posts
ADD COLUMN next_steps TEXT;

-- Add next_steps column to guides table
ALTER TABLE guides
ADD COLUMN next_steps TEXT;

-- Add next_steps column to post_translations table
ALTER TABLE post_translations
ADD COLUMN next_steps TEXT;

-- Add next_steps column to guide_translations table
ALTER TABLE guide_translations
ADD COLUMN next_steps TEXT;
