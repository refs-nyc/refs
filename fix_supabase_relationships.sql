-- Fix Supabase Foreign Key Relationships
-- Based on audit results, we need to add relationships between tables

-- 1. Add foreign key relationship: items -> users
-- items.user_id should reference users.user_id
ALTER TABLE items 
ADD CONSTRAINT fk_items_user_id 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- 2. Add foreign key relationship: items -> refs  
-- items.ref_id should reference refs.id
ALTER TABLE items 
ADD CONSTRAINT fk_items_ref_id 
FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;

-- 3. Add foreign key relationship: user_refs -> users
-- user_refs.user_id should reference users.user_id
ALTER TABLE user_refs 
ADD CONSTRAINT fk_user_refs_user_id 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- 4. Add foreign key relationship: user_refs -> refs
-- user_refs.ref_id should reference refs.id
ALTER TABLE user_refs 
ADD CONSTRAINT fk_user_refs_ref_id 
FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;

-- 5. Add foreign key relationship: ref_vectors -> refs
-- ref_vectors.ref_id should reference refs.id
ALTER TABLE ref_vectors 
ADD CONSTRAINT fk_ref_vectors_ref_id 
FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;

-- 6. Add missing column to user_personalities if it doesn't exist
-- The audit showed this column is missing: ref_ids_used
ALTER TABLE user_personalities 
ADD COLUMN IF NOT EXISTS ref_ids_used TEXT[];

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_user_id ON user_refs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_ref_id ON user_refs(ref_id);
CREATE INDEX IF NOT EXISTS idx_ref_vectors_ref_id ON ref_vectors(ref_id);

-- 8. Enable Row Level Security (RLS) for better security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ref_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for service role access
-- Allow service role to read all data
CREATE POLICY "Service role can read all data" ON items FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_refs FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_personalities FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_ref_personalities FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON ref_vectors FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON search_history FOR SELECT USING (true);

-- Allow service role to insert/update data
CREATE POLICY "Service role can insert data" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert data" ON user_refs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert data" ON user_personalities FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert data" ON user_ref_personalities FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert data" ON ref_vectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert data" ON search_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update data" ON items FOR UPDATE USING (true);
CREATE POLICY "Service role can update data" ON user_refs FOR UPDATE USING (true);
CREATE POLICY "Service role can update data" ON user_personalities FOR UPDATE USING (true);
CREATE POLICY "Service role can update data" ON user_ref_personalities FOR UPDATE USING (true);
CREATE POLICY "Service role can update data" ON ref_vectors FOR UPDATE USING (true);
CREATE POLICY "Service role can update data" ON search_history FOR UPDATE USING (true);

-- 10. Verify the relationships work by testing a simple join query
-- This will help confirm the foreign keys are working
-- SELECT i.id, i.user_id, u.user_id, r.id, r.title 
-- FROM items i 
-- JOIN users u ON i.user_id = u.user_id 
-- JOIN refs r ON i.ref_id = r.id 
-- LIMIT 1; 