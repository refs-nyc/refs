-- Add 7-string and embedding columns to existing items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS seven_string TEXT,
ADD COLUMN IF NOT EXISTS seven_string_embedding vector(1536);

-- Add spirit vector columns to existing users table  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS spirit_vector TEXT,
ADD COLUMN IF NOT EXISTS spirit_vector_embedding vector(1536);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS items_seven_string_embedding_idx ON items USING ivfflat (seven_string_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS users_spirit_vector_embedding_idx ON users USING ivfflat (spirit_vector_embedding vector_cosine_ops);

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable http extension for OpenAI API calls
CREATE EXTENSION IF NOT EXISTS http; 