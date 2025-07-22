#!/usr/bin/env python3
"""
Test just Supabase vector insertion with fake embedding
"""

import os
from supabase import create_client, Client

def test_supabase_vectors():
    """Test Supabase vector insertion with fake embedding"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        print("🗄️  Testing Supabase vector insertion...")
        
        # Create a fake 1536-dimension embedding (all zeros)
        fake_embedding = [0.0] * 1536
        
        # Insert test vector
        test_data = {
            'ref_id': 'test_schema_001',
            'embedding': fake_embedding
        }
        
        result = supabase.table('ref_vectors').insert(test_data).execute()
        print(f"✅ Inserted vector: {len(result.data)} record(s)")
        
        # Verify it was inserted
        verify_result = supabase.table('ref_vectors').select('ref_id').eq('ref_id', 'test_schema_001').execute()
        print(f"✅ Verified: Found {len(verify_result.data)} vectors in database")
        
        # Clean up
        supabase.table('ref_vectors').delete().eq('ref_id', 'test_schema_001').execute()
        print("🧹 Cleaned up test data")
        
        print("🎉 Supabase schema is working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Supabase test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_supabase_vectors() 