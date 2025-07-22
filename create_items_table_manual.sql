-- Drop the table if it exists (from previous failed attempts)
DROP TABLE IF EXISTS items CASCADE;

-- Create the items table
CREATE TABLE items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_items_creator ON items(creator);
CREATE INDEX idx_items_ref_id ON items(ref_id);
CREATE INDEX idx_items_created_at ON items(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Copy data from user_refs to items with proper field mapping
INSERT INTO items (creator, ref_id, text, created_at, updated_at)
SELECT 
    user_id as creator,
    ref_id,
    caption as text,
    created_at,
    NOW() as updated_at
FROM user_refs;

-- Show results
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_items FROM items;
SELECT 'Sample data:' as info;
SELECT creator, ref_id, text, created_at FROM items LIMIT 5; 