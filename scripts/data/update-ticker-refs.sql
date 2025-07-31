-- Update ticker visibility for refs
-- Set showInTicker = false for all refs first
UPDATE refs SET showInTicker = false;

-- Then set showInTicker = true only for the specific refs we want in the ticker
UPDATE refs SET showInTicker = true
WHERE title IN ('Musee d''Orsay', 'Edge City', 'Bringing Up Baby', 'Tennis');
