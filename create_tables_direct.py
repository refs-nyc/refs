#!/usr/bin/env python3
"""
Create database tables directly via Supabase API
"""

import os
import requests
import json

# Configuration
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def create_tables():
    """Create all necessary tables for the per-ref personality system"""
    
    # SQL commands to execute
    sql_commands = [
        # Enable vector extension
        "CREATE EXTENSION IF NOT EXISTS vector;",
        
        # Users table
        """CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            avatar_url TEXT,
            username TEXT,
            email TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );""",
        
        # Refs table  
        """CREATE TABLE IF NOT EXISTS refs (
            id TEXT PRIMARY KEY,
            title TEXT,
            image TEXT,
            creator TEXT,
            type TEXT,
            meta JSONB,
            url TEXT,
            showinticker BOOLEAN,
            created TIMESTAMP,
            updated TIMESTAMP
        );""",
        
        # User refs junction table
        """CREATE TABLE IF NOT EXISTS user_refs (
            user_id TEXT REFERENCES users(user_id),
            ref_id TEXT REFERENCES refs(id),
            caption TEXT,
            created TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, ref_id)
        );""",
        
        # Per-ref personality sentences
        """CREATE TABLE IF NOT EXISTS user_ref_personalities (
            user_id TEXT,
            ref_id TEXT,
            ref_title TEXT,
            personality_sentence TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, ref_id),
            FOREIGN KEY (user_id, ref_id) REFERENCES user_refs(user_id, ref_id)
        );""",
        
        # Composite user personalities (cached from top 12 refs)
        """CREATE TABLE IF NOT EXISTS user_personalities (
            user_id TEXT PRIMARY KEY REFERENCES users(user_id),
            personality_summary TEXT,
            ref_ids_used TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );""",
        
        # Ref vectors for similarity search
        """CREATE TABLE IF NOT EXISTS ref_vectors (
            ref_id TEXT PRIMARY KEY REFERENCES refs(id),
            title TEXT,
            embedding vector(1536),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );""",
        
        # Create index for vector search
        "CREATE INDEX IF NOT EXISTS ref_vectors_embedding_idx ON ref_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);",
        
        # RPC function for ranking people
        """CREATE OR REPLACE FUNCTION rank_people(
            query_embedding vector(1536),
            match_threshold float DEFAULT 0.5,
            match_count int DEFAULT 90
        )
        RETURNS TABLE (
            user_id text,
            name text,
            avatar_url text,
            username text,
            similarity float
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RETURN QUERY
            SELECT DISTINCT
                u.user_id,
                u.name,
                u.avatar_url,
                u.username,
                (rv.embedding <=> query_embedding) * -1 + 1 as similarity
            FROM users u
            JOIN user_refs ur ON u.user_id = ur.user_id
            JOIN ref_vectors rv ON ur.ref_id = rv.ref_id
            WHERE rv.embedding <=> query_embedding < 1 - match_threshold
            ORDER BY similarity DESC
            LIMIT match_count;
        END;
        $$;"""
    ]
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    success_count = 0
    for i, sql in enumerate(sql_commands):
        print(f"Executing command {i+1}/{len(sql_commands)}...")
        
        # Use the SQL execution endpoint
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": sql}
        )
        
        if response.status_code == 200:
            print(f"✅ Command {i+1} executed successfully")
            success_count += 1
        else:
            print(f"❌ Command {i+1} failed: {response.status_code} - {response.text}")
    
    print(f"\n🎯 Summary: {success_count}/{len(sql_commands)} commands executed successfully")
    return success_count == len(sql_commands)

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Missing required environment variables: SUPA_URL, SUPA_KEY")
        exit(1)
    
    print("🚀 Creating database tables for per-ref personality system...")
    success = create_tables()
    
    if success:
        print("✅ All tables created successfully!")
        print("🎉 Database is ready for testing!")
    else:
        print("⚠️  Some commands failed. Check output above.") 