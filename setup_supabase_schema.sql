-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    avatar_url TEXT,
    username TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refs table  
CREATE TABLE IF NOT EXISTS refs (
    id TEXT PRIMARY KEY,
    title TEXT,
    image TEXT,
    creator TEXT,
    type TEXT,
    meta JSONB,
    url TEXT,
    showinticker BOOLEAN,
    created TIMESTAMP,
    updated TIMESTAMP
);

-- User refs junction table
CREATE TABLE IF NOT EXISTS user_refs (
    user_id TEXT REFERENCES users(user_id),
    ref_id TEXT REFERENCES refs(id),
    caption TEXT, -- User's personal caption for this ref
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, ref_id)
);

-- Ref vectors table
CREATE TABLE IF NOT EXISTS ref_vectors (
    ref_id TEXT PRIMARY KEY REFERENCES refs(id),
    vector VECTOR(1536)
);

-- Per-ref personality sentences
CREATE TABLE IF NOT EXISTS user_ref_personalities (
    user_id TEXT REFERENCES users(user_id),
    ref_id TEXT REFERENCES refs(id),
    personality_sentence TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, ref_id)
);

-- Composite user personalities (cached from top 12 refs)
CREATE TABLE IF NOT EXISTS user_personalities (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    personality_summary TEXT NOT NULL,
    ref_ids_used TEXT[], -- Array of ref_ids used to generate this summary
    ref_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to rank people by similarity
CREATE OR REPLACE FUNCTION rank_people(
    p_user TEXT,
    p_ref1 TEXT,
    p_ref2 TEXT, 
    p_ref3 TEXT,
    p_vec VECTOR(1536)
) RETURNS TABLE (
    user_id TEXT,
    name TEXT,
    username TEXT,
    avatar_url TEXT,
    exact_matches INTEGER,
    vector_similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE expanded_refs AS (
        -- Start with the 3 input refs
        SELECT ref_id, 1.0 as weight
        FROM (VALUES (p_ref1), (p_ref2), (p_ref3)) AS input_refs(ref_id)
        WHERE ref_id IS NOT NULL AND ref_id != ''
        
        UNION ALL
        
        -- Add vector-similar refs with lower weight
        SELECT rv.ref_id, 
               GREATEST(0.1, 1.0 - (rv.vector <=> p_vec)) as weight
        FROM ref_vectors rv
        WHERE 1.0 - (rv.vector <=> p_vec) > 0.6  -- Only reasonably similar refs
    ),
    user_scores AS (
        SELECT 
            u.user_id,
            u.name,
            u.username, 
            u.avatar_url,
            -- Count exact matches (higher weight)
            COUNT(CASE WHEN er.ref_id IN (p_ref1, p_ref2, p_ref3) 
                      AND ur.ref_id = er.ref_id THEN 1 END) as exact_matches,
            -- Sum all similarities (exact + vector)
            SUM(er.weight) as total_similarity
        FROM users u
        JOIN user_refs ur ON u.user_id = ur.user_id
        JOIN expanded_refs er ON ur.ref_id = er.ref_id
        WHERE u.user_id != p_user
        GROUP BY u.user_id, u.name, u.username, u.avatar_url
        HAVING COUNT(*) > 0  -- Must have at least one matching ref
    )
    SELECT 
        us.user_id,
        us.name,
        us.username,
        us.avatar_url,
        us.exact_matches::INTEGER,
        us.total_similarity::FLOAT as vector_similarity
    FROM user_scores us
    ORDER BY 
        us.exact_matches DESC,  -- Prioritize exact matches
        us.total_similarity DESC, -- Then vector similarity
        us.user_id  -- Consistent tiebreaker
    LIMIT 90;  -- Return top candidates for further processing
END;
$$ LANGUAGE plpgsql; 