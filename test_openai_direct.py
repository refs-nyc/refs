#!/usr/bin/env python3
"""
Direct test of OpenAI embedding generation and Supabase insertion
"""

import os
from openai import OpenAI
from supabase import create_client, Client

def test_openai_and_supabase():
    """Test OpenAI embedding and Supabase insert directly"""
    
    openai_key = os.getenv('OPENAI_API_KEY')
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not all([openai_key, supabase_url, supabase_key]):
        print("❌ Missing environment variables")
        return False
    
    print("🧪 Testing OpenAI embedding generation...")
    
    try:
        # Test OpenAI
        openai_client = OpenAI(api_key=openai_key)
        
        test_text = "Tennis sport"
        print(f"Generating embedding for: '{test_text}'")
        
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=test_text
        )
        
        embedding = response.data[0].embedding
        print(f"✅ Generated embedding with {len(embedding)} dimensions")
        
        # Test Supabase
        print("🗄️  Testing Supabase insertion...")
        supabase = create_client(supabase_url, supabase_key)
        
        # Insert test vector
        test_data = {
            'ref_id': 'test_direct_001',
            'embedding': embedding
        }
        
        result = supabase.table('ref_vectors').insert(test_data).execute()
        print(f"✅ Inserted vector: {result.data}")
        
        # Verify it was inserted
        verify_result = supabase.table('ref_vectors').select('*').eq('ref_id', 'test_direct_001').execute()
        print(f"✅ Verified: Found {len(verify_result.data)} vectors in database")
        
        # Clean up
        supabase.table('ref_vectors').delete().eq('ref_id', 'test_direct_001').execute()
        print("🧹 Cleaned up test data")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_openai_and_supabase() 