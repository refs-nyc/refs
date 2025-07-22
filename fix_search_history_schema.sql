-- Fix search_history table schema
-- Add missing search_results column to store full search results as JSON

-- Add search_results column as JSONB to store full search results
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS search_results JSONB;

-- Add comment to document the column
COMMENT ON COLUMN search_history.search_results IS 'Full search results as JSON array of PersonResult objects';

-- Create index on search_results for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_results ON search_history USING GIN (search_results);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'search_history' 
ORDER BY ordinal_position; 