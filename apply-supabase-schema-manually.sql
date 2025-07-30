-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist (be careful with this in production!)
-- DROP TABLE IF EXISTS items CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Create items table with 7-string and embedding columns
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, -- Use TEXT to match PocketBase 15-character IDs
  ref_id TEXT NOT NULL,
  creator TEXT NOT NULL, -- Add creator field to match PocketBase
  text TEXT,
  seven_string TEXT,
  seven_string_embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table with spirit vector
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Use TEXT to match PocketBase 15-character IDs
  name TEXT,
  avatar_url TEXT,
  spirit_vector TEXT,
  spirit_vector_embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS items_seven_string_embedding_idx ON items USING ivfflat (seven_string_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS users_spirit_vector_embedding_idx ON users USING ivfflat (spirit_vector_embedding vector_cosine_ops);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS items_ref_id_idx ON items (ref_id);
CREATE INDEX IF NOT EXISTS items_creator_idx ON items (creator);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 