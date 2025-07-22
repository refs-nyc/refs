-- Create user_personalities table for caching personality summaries
CREATE TABLE IF NOT EXISTS user_personalities (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    personality_summary TEXT NOT NULL,
    ref_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE user_personalities ENABLE ROW LEVEL SECURITY;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_personalities_user_id ON user_personalities(user_id);

-- Example query to check the table was created
-- SELECT * FROM user_personalities LIMIT 5; 