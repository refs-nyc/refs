#!/usr/bin/env python3
"""
Test Supabase raw access and table structure
"""

import os
from supabase import create_client, Client

def test_supabase_raw():
    """Test raw Supabase access"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🔍 Testing table access...")
        
        # Test basic table access
        try:
            result = supabase.table('refs').select('id').limit(1).execute()
            print(f"✅ refs table accessible: {len(result.data)} rows")
        except Exception as e:
            print(f"❌ refs table error: {e}")
        
        try:
            result = supabase.table('users').select('id').limit(1).execute()
            print(f"✅ users table accessible: {len(result.data)} rows")
        except Exception as e:
            print(f"❌ users table error: {e}")
        
        try:
            result = supabase.table('ref_vectors').select('ref_id').limit(1).execute()
            print(f"✅ ref_vectors table accessible: {len(result.data)} rows")
        except Exception as e:
            print(f"❌ ref_vectors table error: {e}")
        
        try:
            result = supabase.table('user_refs').select('user_id').limit(1).execute()
            print(f"✅ user_refs table accessible: {len(result.data)} rows")
        except Exception as e:
            print(f"❌ user_refs table error: {e}")
        
        # Try raw SQL query
        print("\n🔧 Testing raw SQL access...")
        try:
            result = supabase.rpc('exec_sql', {'sql': 'SELECT COUNT(*) as count FROM ref_vectors'}).execute()
            print(f"✅ Raw SQL works: {result.data}")
        except Exception as e:
            print(f"❌ Raw SQL error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_supabase_raw() 