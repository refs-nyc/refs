#!/usr/bin/env python3
"""
Check what columns exist in user_refs table
"""

import os
from supabase import create_client, Client

def test_user_refs_columns():
    """Test what columns exist in user_refs table"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🔍 Testing different column names in user_refs table...")
        
        # Try different possible column names
        possible_columns = ['id', 'user_id', 'ref_id', 'item_id', 'created', 'created_at', '*']
        
        for col in possible_columns:
            try:
                result = supabase.table('user_refs').select(col).limit(1).execute()
                print(f"✅ Column '{col}' exists: {len(result.data)} rows")
                if result.data:
                    print(f"   Sample data: {result.data[0]}")
            except Exception as e:
                print(f"❌ Column '{col}' error: {e}")
        
        # Try inserting with minimal columns
        print("\n🧪 Testing insertion with minimal columns...")
        try:
            test_data = {
                'user_id': 'test_user_001',
                'ref_id': 'test_ref_001'
            }
            result = supabase.table('user_refs').insert(test_data).execute()
            print(f"✅ Minimal insert works: {len(result.data)} record(s)")
            
            # Clean up
            supabase.table('user_refs').delete().eq('user_id', 'test_user_001').execute()
            print("🧹 Cleaned up test data")
            
        except Exception as e:
            print(f"❌ Minimal insert failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_user_refs_columns() 