-- Test Supabase Schema with Real Data Structure
-- This simulates what we need for search to work

-- First, let's insert some test data that matches the real structure
INSERT INTO users (id, name, userName, avatarURL, email) VALUES
('rpr8bjg26q72z81', 'Test User', 'testuser', 'https://example.com/avatar.jpg', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert a ref that matches what we see in the logs
INSERT INTO refs (id, title, creator, type) VALUES
('57zo03e673833uq', 'Test Reference', 'rpr8bjg26q72z81', 'other')
ON CONFLICT (id) DO NOTHING;

-- Insert the actual item from the logs
INSERT INTO items (id, ref, text, creator, image) VALUES
('vd5h0911o7ik285', '57zo03e673833uq', 'Went crazy', 'rpr8bjg26q72z81', 'https://violet-fashionable-blackbird-836.mypinata.cloud/files/bafybeih332gyigwiv2rzem7yxerbdykaamfo5m5ej7o7v5dofgqi754kjy?X-Algorithm=PINATA1&X-Date=1748814945102&X-Expires=500000&X-Method=GET&X-Signature=03601bcd467bd55678009c98164a449e931b40792a3c20a2f0f4e6d7bf21a675')
ON CONFLICT (id) DO NOTHING;

-- Insert another item for testing
INSERT INTO items (id, ref, text, creator, image) VALUES
('t813b63x83163wt', '68b6i39548op810', 'King''s Cup, but you make up minigames for every card. Personal favorite is chin on table til someone draws that card again, or you can get them to answer a question', 'rpr8bjg26q72z81', 'https://violet-fashionable-blackbird-836.mypinata.cloud/files/bafybeibvi2xlmy3fg7yolvrxdlpni422gjwzmo7lmfpaw6hsd33hxnttfa?X-Algorithm=PINATA1&X-Date=1748814511169&X-Expires=500000&X-Method=GET&X-Signature=8e410ba740f563a2b28a787c2556eb3886a38342c56ca1c5ece2bd0f14f64367')
ON CONFLICT (id) DO NOTHING;

-- Insert the corresponding ref for the second item
INSERT INTO refs (id, title, creator, type) VALUES
('68b6i39548op810', 'King''s Cup Reference', 'rpr8bjg26q72z81', 'other')
ON CONFLICT (id) DO NOTHING;

-- Test query: This should return the items when we search for them
SELECT
  i.id as item_id,
  i.ref as ref_id,
  i.text as caption,
  i.creator as user_id,
  r.title as ref_title,
  u.name as user_name
FROM items i
LEFT JOIN refs r ON i.ref = r.id
LEFT JOIN users u ON i.creator = u.id
WHERE i.id IN ('vd5h0911o7ik285', 't813b63x83163wt');
