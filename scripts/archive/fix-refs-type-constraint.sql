-- Fix refs type constraint to allow empty/null values
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE refs DROP CONSTRAINT IF EXISTS refs_type_check;

-- Add a new constraint that allows empty/null values
ALTER TABLE refs ADD CONSTRAINT refs_type_check 
CHECK (type IS NULL OR type IN ('place', 'artwork', 'other'));

-- Now let's re-run the sync for the failed refs
-- You can run the sync script again to populate the missing refs 