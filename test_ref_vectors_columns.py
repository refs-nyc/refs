#!/usr/bin/env python3
"""
Check what columns exist in ref_vectors table
"""

import os
from supabase import create_client, Client

def test_ref_vectors_columns():
    """Test what columns exist in ref_vectors table"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🔍 Testing different column names in ref_vectors table...")
        
        # Try different possible column names
        possible_columns = ['id', 'ref_id', 'embedding', 'vector', 'created_at', '*']
        
        for col in possible_columns:
            try:
                result = supabase.table('ref_vectors').select(col).limit(1).execute()
                print(f"✅ Column '{col}' exists: {len(result.data)} rows")
                if result.data:
                    print(f"   Sample data: {result.data[0]}")
            except Exception as e:
                print(f"❌ Column '{col}' error: {e}")
        
        # Try inserting without embedding column
        print("\n🧪 Testing insertion with basic columns only...")
        try:
            test_data = {
                'ref_id': 'test_basic_001'
            }
            result = supabase.table('ref_vectors').insert(test_data).execute()
            print(f"✅ Basic insert works: {len(result.data)} record(s)")
            
            # Clean up
            supabase.table('ref_vectors').delete().eq('ref_id', 'test_basic_001').execute()
            print("🧹 Cleaned up test data")
            
        except Exception as e:
            print(f"❌ Basic insert failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_ref_vectors_columns() 