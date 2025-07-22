-- Create the missing user_ref_personalities table
CREATE TABLE IF NOT EXISTS user_ref_personalities (
    user_id TEXT REFERENCES users(user_id),
    ref_id TEXT REFERENCES refs(id),
    personality_sentence TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, ref_id)
); 