-- Conservative fix for PocketBase deleted field issue
-- Restore ALL items with deleted timestamps (treating them all as schema bug victims)

-- First, let's see the current state
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN deleted IS NOT NULL THEN 1 END) as marked_as_deleted,
    COUNT(CASE WHEN deleted IS NULL THEN 1 END) as active_items
FROM items;

-- Fix the schema to prevent future issues
UPDATE _pb_schema_fields 
SET options = jsonb_set(
    options::jsonb, 
    '{onCreate}', 
    'false'::jsonb
)
WHERE collection_id = 'pbc_3952703650' 
AND name = 'deleted';

-- Restore ALL items that were marked as deleted
-- (treating them all as schema bug victims)
UPDATE items 
SET deleted = NULL 
WHERE deleted IS NOT NULL;

-- Verify the fix
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN deleted IS NULL THEN 1 END) as active_items,
    COUNT(CASE WHEN deleted IS NOT NULL THEN 1 END) as still_deleted
FROM items;

-- Show some sample restored items
SELECT 
    id,
    text,
    created,
    deleted
FROM items 
WHERE deleted IS NULL
LIMIT 10; 