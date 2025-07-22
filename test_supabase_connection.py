#!/usr/bin/env python3
"""
Test Supabase connection and check schema
"""

import os
from supabase import create_client, Client

def test_connection():
    """Test Supabase connection and check schema"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPA_URL or SUPA_KEY environment variables")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔗 Testing Supabase connection...")
        
        # Test each table individually
        tables_to_test = ['users', 'refs', 'ref_vectors', 'user_refs']
        
        for table in tables_to_test:
            try:
                print(f"\n🔍 Testing {table} table...")
                
                # Try to get count
                result = supabase.table(table).select("*", count='exact').limit(1).execute()
                print(f"✅ {table}: {result.count} records, first row: {result.data}")
                
            except Exception as e:
                print(f"❌ Error with {table}: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

if __name__ == "__main__":
    test_connection() 