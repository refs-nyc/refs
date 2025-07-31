-- Add ref_images column to search_history table
ALTER TABLE search_history
ADD COLUMN IF NOT EXISTS ref_images TEXT[] DEFAULT '{}';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS search_history_ref_images_idx ON search_history USING GIN (ref_images);
