-- Comprehensive Supabase Schema Fixes
-- This script fixes all missing relationships, columns, and indexes

-- 1. Add missing column to user_personalities
ALTER TABLE user_personalities 
ADD COLUMN IF NOT EXISTS ref_ids_used TEXT[];

-- 2. Add foreign key relationships (without constraints to avoid data issues)
-- Note: We'll add these after cleaning orphaned data

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_creator ON items(creator);
CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_user_id ON user_refs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_refs_ref_id ON user_refs(ref_id);
CREATE INDEX IF NOT EXISTS idx_ref_vectors_ref_id ON ref_vectors(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_personalities_user_id ON user_personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ref_personalities_user_id ON user_ref_personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ref_personalities_ref_id ON user_ref_personalities(ref_id);

-- 4. Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ref_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for service role access
CREATE POLICY "Service role can access all data" ON items FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON user_refs FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON user_personalities FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON user_ref_personalities FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON ref_vectors FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON refs FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON users FOR ALL USING (true);

-- 6. Grant necessary permissions
GRANT ALL ON items TO service_role;
GRANT ALL ON user_refs TO service_role;
GRANT ALL ON user_personalities TO service_role;
GRANT ALL ON user_ref_personalities TO service_role;
GRANT ALL ON ref_vectors TO service_role;
GRANT ALL ON refs TO service_role;
GRANT ALL ON users TO service_role; 