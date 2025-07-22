#!/usr/bin/env python3
"""
Test vector insertion with correct column name
"""

import os
from supabase import create_client, Client

def test_vector_insert_correct():
    """Test vector insertion with correct column name"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🗄️  Testing vector insertion with correct column name...")
        
        # Create a fake 1536-dimension embedding (all zeros)
        fake_embedding = [0.0] * 1536
        
        # Insert test vector using 'vector' column name instead of 'embedding'
        test_data = {
            'ref_id': 'test_vector_correct_001',
            'vector': fake_embedding  # Use 'vector' instead of 'embedding'
        }
        
        result = supabase.table('ref_vectors').insert(test_data).execute()
        print(f"✅ Inserted vector: {len(result.data)} record(s)")
        
        # Verify it was inserted
        verify_result = supabase.table('ref_vectors').select('ref_id').eq('ref_id', 'test_vector_correct_001').execute()
        print(f"✅ Verified: Found {len(verify_result.data)} vectors in database")
        
        # Clean up
        supabase.table('ref_vectors').delete().eq('ref_id', 'test_vector_correct_001').execute()
        print("🧹 Cleaned up test data")
        
        print("🎉 Vector insertion is working with correct column name!")
        return True
        
    except Exception as e:
        print(f"❌ Vector test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_vector_insert_correct() 