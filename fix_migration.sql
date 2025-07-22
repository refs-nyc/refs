-- Fixed migration script to rename user_refs to items and handle foreign key constraints

-- Step 1: Drop the items table if it exists (from failed migration)
DROP TABLE IF EXISTS items CASCADE;

-- Step 2: Create the items table without foreign key constraints initially
CREATE TABLE items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Copy data from user_refs to items
INSERT INTO items (creator, ref_id, text, created_at, updated_at)
SELECT 
    user_id as creator,
    ref_id,
    caption as text,
    created_at,
    updated_at
FROM user_refs;

-- Step 4: Add indexes
CREATE INDEX idx_items_creator ON items(creator);
CREATE INDEX idx_items_ref_id ON items(ref_id);
CREATE INDEX idx_items_created_at ON items(created_at);

-- Step 5: Add foreign key constraint only for users that exist
-- First, let's see what users exist in the users table
-- We'll add the constraint only for valid user IDs

-- Step 6: Create a function to safely add foreign key constraint
CREATE OR REPLACE FUNCTION add_safe_foreign_key_constraint()
RETURNS void AS $$
DECLARE
    missing_users TEXT[];
BEGIN
    -- Find users in items table that don't exist in users table
    SELECT array_agg(DISTINCT i.creator) INTO missing_users
    FROM items i
    LEFT JOIN users u ON i.creator = u.user_id
    WHERE u.user_id IS NULL;
    
    -- If there are missing users, delete those records
    IF array_length(missing_users, 1) IS NOT NULL THEN
        RAISE NOTICE 'Deleting items for non-existent users: %', missing_users;
        DELETE FROM items WHERE creator = ANY(missing_users);
    END IF;
    
    -- Now add the foreign key constraint
    ALTER TABLE items 
    ADD CONSTRAINT items_creator_fkey 
    FOREIGN KEY (creator) REFERENCES users(user_id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Successfully added foreign key constraint';
END;
$$ LANGUAGE plpgsql;

-- Step 7: Execute the function
SELECT add_safe_foreign_key_constraint();

-- Step 8: Drop the function
DROP FUNCTION add_safe_foreign_key_constraint();

-- Step 9: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Verify the migration
SELECT 
    'items' as table_name,
    COUNT(*) as record_count
FROM items
UNION ALL
SELECT 
    'user_refs' as table_name,
    COUNT(*) as record_count
FROM user_refs;

-- Show sample data
SELECT 
    creator,
    ref_id,
    text,
    created_at
FROM items 
LIMIT 5; 