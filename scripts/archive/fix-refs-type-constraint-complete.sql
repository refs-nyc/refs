-- Complete fix for refs type constraint
-- Run this in your Supabase SQL Editor

-- First, let's see what the current constraint looks like
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'refs'::regclass AND conname = 'refs_type_check';

-- Drop the existing constraint completely
ALTER TABLE refs DROP CONSTRAINT IF EXISTS refs_type_check;

-- Add a new constraint that allows NULL values and the valid types
ALTER TABLE refs ADD CONSTRAINT refs_type_check
CHECK (type IS NULL OR type = '' OR type IN ('place', 'artwork', 'other'));

-- Now let's verify the constraint was created correctly
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'refs'::regclass AND conname = 'refs_type_check';
