-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    ref_ids TEXT[] NOT NULL, -- Array of ref IDs used in the search
    ref_titles TEXT[] NOT NULL, -- Array of ref titles for display
    search_title TEXT, -- Generated title like "People into Chess, Jazz, Philosophy"
    search_subtitle TEXT, -- Generated subtitle
    result_count INTEGER DEFAULT 0, -- Number of results found
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

-- Create index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Example query to check the table was created
-- SELECT * FROM search_history LIMIT 5; 