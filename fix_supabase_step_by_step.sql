-- Step 1: Add missing column to user_personalities
ALTER TABLE user_personalities 
ADD COLUMN IF NOT EXISTS ref_ids_used TEXT[];

-- Step 2: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_user_id ON user_refs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_ref_id ON user_refs(ref_id);
CREATE INDEX IF NOT EXISTS idx_ref_vectors_ref_id ON ref_vectors(ref_id);

-- Step 3: Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ref_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for service role access
CREATE POLICY "Service role can read all data" ON items FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_refs FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_personalities FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON user_ref_personalities FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON ref_vectors FOR SELECT USING (true);
CREATE POLICY "Service role can read all data" ON search_history FOR SELECT USING (true);

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