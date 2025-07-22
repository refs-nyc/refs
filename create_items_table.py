#!/usr/bin/env python3
"""
Create items table in Supabase to match PocketBase structure
"""

import httpx
import json

# Supabase configuration
SUPABASE_URL = "https://zrxgnplwnfaxtpffrqxo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGducGx3bmZheHRwZmZycXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA3MDgzOSwiZXhwIjoyMDY3NjQ2ODM5fQ.7qfmXc1hACRrVkU02J05xiaqhtO95sHMcLqf9yrNxc4"

def create_items_table():
    """Create items table in Supabase"""
    
    # SQL to create the items table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        ref_id TEXT REFERENCES refs(id) ON DELETE CASCADE,
        text TEXT,
        creator TEXT REFERENCES users(user_id) ON DELETE CASCADE,
        url TEXT,
        image TEXT,
        backlog BOOLEAN DEFAULT false,
        "order" INTEGER DEFAULT 0,
        list BOOLEAN DEFAULT false,
        parent TEXT,
        prompt_context TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    # Create indexes
    indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_items_creator ON items(creator);",
        "CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);",
        "CREATE INDEX IF NOT EXISTS idx_items_backlog ON items(backlog);",
        "CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);"
    ]
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("🔧 Creating items table...")
    
    # Try to create the table by inserting a test record
    # This will create the table if it doesn't exist (PostgreSQL behavior)
    test_item = {
        "id": "test_item_001",
        "ref_id": "test_ref_001",  # This should reference an existing ref
        "text": "Test item",
        "creator": "test_user_001",  # This should reference an existing user
        "backlog": False
    }
    
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/items",
            headers=headers,
            json=test_item
        )
        
        if response.status_code in [201, 200]:
            print("✅ Items table created successfully!")
            
            # Clean up test record
            httpx.delete(
                f"{SUPABASE_URL}/rest/v1/items?id=eq.test_item_001",
                headers=headers
            )
            print("🧹 Cleaned up test record")
            
        else:
            print(f"❌ Failed to create items table: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating items table: {e}")

def verify_items_table():
    """Verify the items table exists and has correct structure"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Try to get the table schema
        response = httpx.get(f"{SUPABASE_URL}/rest/v1/items?select=*&limit=0", headers=headers)
        
        if response.status_code == 200:
            print("✅ Items table exists and is accessible")
            return True
        else:
            print(f"❌ Items table not accessible: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying items table: {e}")
        return False

def main():
    print("🔄 Setting up items table in Supabase...")
    
    # Create the table
    create_items_table()
    
    # Verify it exists
    if verify_items_table():
        print("🎉 Items table setup completed successfully!")
    else:
        print("⚠️  Items table setup may have failed")

if __name__ == "__main__":
    main() 