#!/usr/bin/env python3
"""
Create search history table in Supabase
"""

import os
from supabase import create_client, Client

def create_search_history_table():
    """Create the search history table"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPA_URL or SUPA_KEY environment variables")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔧 Creating search history table...")
        
        # Create search history table
        sql = """
        CREATE TABLE IF NOT EXISTS search_history (
            id SERIAL PRIMARY KEY,
            user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
            ref_ids TEXT[] NOT NULL,
            ref_titles TEXT[] NOT NULL,
            search_title TEXT,
            search_subtitle TEXT,
            result_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Execute the SQL
        result = supabase.postgrest.schema("public").rpc("sql", {"query": sql}).execute()
        print("✅ Search history table created successfully")
        
        # Create indexes
        print("🔍 Creating indexes...")
        
        index_sql = """
        CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
        """
        
        supabase.postgrest.schema("public").rpc("sql", {"query": index_sql}).execute()
        print("✅ Indexes created successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating search history table: {e}")
        return False

if __name__ == "__main__":
    create_search_history_table() 