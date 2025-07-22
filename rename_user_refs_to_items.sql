-- Rename user_refs table to items and update schema to match PocketBase
-- This creates consistency between PocketBase and Supabase naming

-- Step 1: Create new items table with proper structure
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,  -- PocketBase Items.id
    ref_id TEXT REFERENCES refs(id) ON DELETE CASCADE,  -- PocketBase Items.ref
    text TEXT,  -- PocketBase Items.text (user's caption)
    creator TEXT REFERENCES users(user_id) ON DELETE CASCADE,  -- PocketBase Items.creator (user_id)
    url TEXT,
    image TEXT,
    backlog BOOLEAN DEFAULT false,  -- PocketBase Items.backlog
    "order" INTEGER DEFAULT 0,  -- PocketBase Items.order
    list BOOLEAN DEFAULT false,  -- PocketBase Items.list
    parent TEXT,
    prompt_context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Copy data from user_refs to items (if user_refs exists)
INSERT INTO items (id, ref_id, text, creator, created_at, updated_at)
SELECT 
    CONCAT(user_id, '_', ref_id) as id,  -- Generate synthetic ID since we don't have original
    ref_id,
    COALESCE(caption, '') as text,
    user_id as creator,
    created_at,
    created_at as updated_at
FROM user_refs
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update foreign key references in other tables
-- Update user_ref_personalities table
ALTER TABLE user_ref_personalities 
RENAME COLUMN user_id TO creator;

ALTER TABLE user_ref_personalities 
RENAME COLUMN ref_id TO ref_id;

-- Add new foreign key constraint
ALTER TABLE user_ref_personalities 
ADD CONSTRAINT fk_user_ref_personalities_items 
FOREIGN KEY (creator, ref_id) REFERENCES items(creator, ref_id);

-- Step 4: Drop old user_refs table (after confirming data migration)
-- DROP TABLE IF EXISTS user_refs;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_creator ON items(creator);
CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);
CREATE INDEX IF NOT EXISTS idx_items_backlog ON items(backlog);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Step 6: Update the rank_people function to use items table
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
                      AND i.ref_id = er.ref_id THEN 1 END) as exact_matches,
            -- Sum all similarities (exact + vector)
            SUM(er.weight) as total_similarity
        FROM users u
        JOIN items i ON u.user_id = i.creator
        JOIN expanded_refs er ON i.ref_id = er.ref_id
        WHERE u.user_id != p_user AND i.backlog = false  -- Only grid items
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

-- Step 7: Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as items_count FROM items;
SELECT COUNT(*) as grid_items_count FROM items WHERE backlog = false; 