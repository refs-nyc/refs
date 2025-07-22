#!/usr/bin/env python3
"""
Check what columns exist in users table
"""

import os
from supabase import create_client, Client

def test_users_columns():
    """Test what columns exist in users table"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🔍 Testing different column names in users table...")
        
        # Try different possible column names
        possible_columns = ['id', 'userId', 'user_id', 'firstName', 'first_name', 'username', '*']
        
        for col in possible_columns:
            try:
                result = supabase.table('users').select(col).limit(1).execute()
                print(f"✅ Column '{col}' exists: {len(result.data)} rows")
                if result.data:
                    print(f"   Sample data: {result.data[0]}")
            except Exception as e:
                print(f"❌ Column '{col}' error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_users_columns() 