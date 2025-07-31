-- Complete Supabase Schema Setup for Refs Search
-- Run this in your Supabase SQL Editor

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS refs CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS http;

-- Create items table matching PocketBase schema exactly
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, -- PocketBase uses 15-char text IDs
  ref TEXT, -- Relation to refs collection
  image TEXT,
  text TEXT,
  url TEXT,
  backlog BOOLEAN DEFAULT false,
  "order" INTEGER,
  creator TEXT, -- Relation to users collection
  list BOOLEAN DEFAULT false,
  parent TEXT, -- Self-relation
  promptContext TEXT,
  created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Supabase-specific columns for embeddings
  seven_string TEXT,
  seven_string_embedding vector(1536)
);

-- Create refs table matching PocketBase schema exactly
CREATE TABLE IF NOT EXISTS refs (
  id TEXT PRIMARY KEY, -- PocketBase uses 15-char text IDs
  title TEXT,
  image TEXT,
  creator TEXT, -- Relation to users collection
  type TEXT CHECK (type IN ('place', 'artwork', 'other')),
  meta TEXT,
  url TEXT,
  "showInTicker" BOOLEAN DEFAULT false,
  created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table matching PocketBase schema exactly
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- PocketBase uses 15-char text IDs
  name TEXT,
  avatarURL TEXT,
  userName TEXT,
  email TEXT,
  created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Supabase-specific columns for spirit vector
  spirit_vector TEXT,
  spirit_vector_embedding vector(1536)
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS items_seven_string_embedding_idx ON items USING ivfflat (seven_string_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS users_spirit_vector_embedding_idx ON users USING ivfflat (spirit_vector_embedding vector_cosine_ops);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS items_ref_idx ON items (ref);
CREATE INDEX IF NOT EXISTS items_creator_idx ON items (creator);
CREATE INDEX IF NOT EXISTS refs_creator_idx ON refs (creator);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refs_updated_at ON refs;
CREATE TRIGGER update_refs_updated_at BEFORE UPDATE ON refs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
INSERT INTO users (id, name, userName, avatarURL, email) VALUES
('test_user_1', 'Test User', 'testuser', 'https://example.com/avatar.jpg', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO refs (id, title, creator, type) VALUES
('test_ref_1', 'Test Reference', 'test_user_1', 'other')
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, ref, text, creator, image) VALUES
('test_item_1', 'test_ref_1', 'Test item text', 'test_user_1', 'https://example.com/image.jpg')
ON CONFLICT (id) DO NOTHING;
