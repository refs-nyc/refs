-- Fix the deleted field in PocketBase items collection
-- The deleted field should not be set on creation, only on deletion

-- First, let's see the current schema
SELECT 
    name,
    type,
    options
FROM _pb_schema_fields 
WHERE collection_id = 'pbc_3952703650' 
AND name = 'deleted';

-- Update the deleted field to not set onCreate
UPDATE _pb_schema_fields 
SET options = jsonb_set(
    options::jsonb, 
    '{onCreate}', 
    'false'::jsonb
)
WHERE collection_id = 'pbc_3952703650' 
AND name = 'deleted';

-- Verify the change
SELECT 
    name,
    type,
    options
FROM _pb_schema_fields 
WHERE collection_id = 'pbc_3952703650' 
AND name = 'deleted';

-- Clear the deleted field for all existing items (since they shouldn't be deleted)
UPDATE items 
SET deleted = NULL 
WHERE deleted IS NOT NULL;

-- Verify the fix
SELECT COUNT(*) as total_items, 
       COUNT(deleted) as deleted_items,
       COUNT(*) - COUNT(deleted) as active_items
FROM items; 