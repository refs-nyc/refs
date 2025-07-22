#!/usr/bin/env python3

import os
from supabase import create_client

# Get environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not SUPA_URL or not SUPA_KEY:
    print("Missing required environment variables: SUPA_URL, SUPA_KEY")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPA_URL, SUPA_KEY)

# SQL to create user_personalities table
create_table_sql = """
CREATE TABLE IF NOT EXISTS user_personalities (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    personality_summary TEXT NOT NULL,
    ref_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""

try:
    # Execute the SQL
    result = supabase.rpc("sql", {"query": create_table_sql}).execute()
    print("✅ user_personalities table created successfully!")
    print(f"Result: {result}")
except Exception as e:
    print(f"❌ Error creating table: {e}")
    
    # Try alternative approach - just check if we can query it
    try:
        result = supabase.table("user_personalities").select("*").limit(1).execute()
        print("✅ user_personalities table already exists!")
    except Exception as e2:
        print(f"❌ Table definitely doesn't exist: {e2}")
        print("You may need to run this SQL manually in the Supabase dashboard:")
        print(create_table_sql) 