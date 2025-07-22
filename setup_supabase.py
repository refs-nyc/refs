#!/usr/bin/env python3
"""
Setup Supabase schema for refs people finder
"""

import os
from supabase import create_client, Client

def setup_schema():
    """Create all necessary tables and functions in Supabase"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPA_URL or SUPA_KEY environment variables")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔧 Setting up Supabase schema...")
        
        # Enable vector extension
        print("🧩 Enabling vector extension...")
        supabase.postgrest.schema("").rpc("sql", {
            "query": "CREATE EXTENSION IF NOT EXISTS vector;"
        }).execute()
        
        # Create users table
        print("👥 Creating users table...")
        users_sql = """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            userName TEXT,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            image TEXT,
            location TEXT,
            lat FLOAT,
            lon FLOAT,
            created TIMESTAMP,
            updated TIMESTAMP
        );
        """
        supabase.postgrest.schema("").rpc("sql", {"query": users_sql}).execute()
        
        # Create refs table
        print("📚 Creating refs table...")
        refs_sql = """
        CREATE TABLE IF NOT EXISTS refs (
            id TEXT PRIMARY KEY,
            title TEXT,
            image TEXT,
            creator TEXT,
            type TEXT,
            meta JSONB,
            url TEXT,
            showInTicker BOOLEAN,
            created TIMESTAMP,
            updated TIMESTAMP
        );
        """
        supabase.postgrest.schema("").rpc("sql", {"query": refs_sql}).execute()
        
        # Create ref_vectors table
        print("🧠 Creating ref_vectors table...")
        vectors_sql = """
        CREATE TABLE IF NOT EXISTS ref_vectors (
            id SERIAL PRIMARY KEY,
            ref_id TEXT REFERENCES refs(id) ON DELETE CASCADE,
            embedding vector(1536),
            created_at TIMESTAMP DEFAULT NOW()
        );
        """
        supabase.postgrest.schema("").rpc("sql", {"query": vectors_sql}).execute()
        
        # Create user_refs table
        print("🔗 Creating user_refs table...")
        user_refs_sql = """
        CREATE TABLE IF NOT EXISTS user_refs (
            id SERIAL PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            ref_id TEXT REFERENCES refs(id) ON DELETE CASCADE,
            item_id TEXT,
            backlog BOOLEAN DEFAULT false,
            created TIMESTAMP,
            UNIQUE(user_id, ref_id, item_id)
        );
        """
        supabase.postgrest.schema("").rpc("sql", {"query": user_refs_sql}).execute()
        
        # Create vector index
        print("🔍 Creating vector search index...")
        index_sql = """
        CREATE INDEX IF NOT EXISTS ref_vectors_embedding_idx ON ref_vectors 
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        """
        supabase.postgrest.schema("").rpc("sql", {"query": index_sql}).execute()
        
        # Create ranking function
        print("🏆 Creating people ranking function...")
        function_sql = """
        CREATE OR REPLACE FUNCTION rank_people(target_user_id TEXT, similarity_threshold FLOAT DEFAULT 0.7)
        RETURNS TABLE(
            user_id TEXT,
            userName TEXT,
            firstName TEXT,
            lastName TEXT,
            score FLOAT,
            shared_refs_exact INTEGER,
            shared_refs_similar INTEGER,
            closest_beacon_distance FLOAT
        ) AS $$
        BEGIN
            RETURN QUERY
            WITH target_refs AS (
                SELECT ur.ref_id
                FROM user_refs ur
                WHERE ur.user_id = target_user_id
            ),
            target_vectors AS (
                SELECT rv.embedding
                FROM ref_vectors rv
                JOIN target_refs tr ON rv.ref_id = tr.ref_id
            ),
            user_similarities AS (
                SELECT 
                    u.id as user_id,
                    u.userName,
                    u.firstName,
                    u.lastName,
                    COUNT(CASE WHEN tr.ref_id IS NOT NULL THEN 1 END) as shared_refs_exact,
                    COUNT(CASE 
                        WHEN tv.embedding IS NOT NULL 
                        AND (1 - (rv.embedding <=> tv.embedding)) >= similarity_threshold 
                        THEN 1 
                    END) as shared_refs_similar,
                    MIN(rv.embedding <=> tv.embedding) as closest_beacon_distance
                FROM users u
                JOIN user_refs ur ON u.id = ur.user_id
                JOIN ref_vectors rv ON ur.ref_id = rv.ref_id
                LEFT JOIN target_refs tr ON ur.ref_id = tr.ref_id
                CROSS JOIN target_vectors tv
                WHERE u.id != target_user_id
                GROUP BY u.id, u.userName, u.firstName, u.lastName
            )
            SELECT 
                us.user_id,
                us.userName,
                us.firstName,
                us.lastName,
                (us.shared_refs_exact * 3.0 + (1 - COALESCE(us.closest_beacon_distance, 1.0)) * 0.25) as score,
                us.shared_refs_exact::INTEGER,
                us.shared_refs_similar::INTEGER,
                COALESCE(us.closest_beacon_distance, 1.0) as closest_beacon_distance
            FROM user_similarities us
            WHERE us.shared_refs_exact > 0 OR us.closest_beacon_distance < 1.0
            ORDER BY score DESC;
        END;
        $$ LANGUAGE plpgsql;
        """
        supabase.postgrest.schema("").rpc("sql", {"query": function_sql}).execute()
        
        print("✅ Supabase schema setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up schema: {e}")
        return False

if __name__ == "__main__":
    setup_schema() 