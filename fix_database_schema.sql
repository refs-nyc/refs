-- Fix database schema issues

-- Add missing ref_ids_used column to user_personalities table
ALTER TABLE user_personalities 
ADD COLUMN IF NOT EXISTS ref_ids_used TEXT[] DEFAULT '{}';

-- Add missing ref_count column to user_personalities table  
ALTER TABLE user_personalities 
ADD COLUMN IF NOT EXISTS ref_count INTEGER DEFAULT 0;

-- Add missing search_results column to search_history table
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS search_results JSONB;

-- Create user_ref_personalities table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_ref_personalities (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    ref_id TEXT REFERENCES refs(id) ON DELETE CASCADE,
    personality_sentence TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, ref_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_ref_personalities_user_id ON user_ref_personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ref_personalities_ref_id ON user_ref_personalities(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_ref_personalities_user_ref ON user_ref_personalities(user_id, ref_id);

-- Create user_personalities table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_personalities (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    personality_summary TEXT NOT NULL,
    ref_ids_used TEXT[] DEFAULT '{}',
    ref_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for user_personalities
CREATE INDEX IF NOT EXISTS idx_user_personalities_user_id ON user_personalities(user_id);

-- Create search_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    ref_ids TEXT[] NOT NULL,
    ref_titles TEXT[] NOT NULL,
    search_title TEXT,
    search_subtitle TEXT,
    result_count INTEGER DEFAULT 0,
    search_results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC); 