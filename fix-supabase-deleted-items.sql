-- Fix deleted items in Supabase
-- Clear the deleted field for all items since they shouldn't be deleted

-- First, let's see the current state
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN deleted IS NOT NULL THEN 1 END) as deleted_items,
    COUNT(CASE WHEN deleted IS NULL THEN 1 END) as active_items
FROM items;

-- Clear the deleted field for all items
UPDATE items 
SET deleted = NULL 
WHERE deleted IS NOT NULL;

-- Verify the fix
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN deleted IS NOT NULL THEN 1 END) as deleted_items,
    COUNT(CASE WHEN deleted IS NULL THEN 1 END) as active_items
FROM items;

-- Show some sample items to verify they're now active
SELECT 
    id,
    text,
    creator,
    deleted,
    created_at
FROM items 
LIMIT 10; 