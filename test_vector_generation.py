#!/usr/bin/env python3
"""
Test vector generation directly
"""

import os
import requests
from supabase import create_client, Client

def test_vector_generation():
    """Test vector generation for the synced refs"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Get the synced refs from Supabase
        print("📚 Getting synced refs from Supabase...")
        result = supabase.table('refs').select('id, title, type').execute()
        refs = result.data
        
        if not refs:
            print("❌ No refs found in Supabase")
            return False
            
        print(f"✅ Found {len(refs)} refs in Supabase")
        for ref in refs[:5]:  # Show first 5
            print(f"   - {ref['title']} ({ref['type']})")
        
        # Test API endpoints directly
        print("\n🔍 Testing API endpoints...")
        
        # Test health
        try:
            response = requests.get('http://localhost:8000/health', timeout=5)
            print(f"Health check: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
        
        # Test generate-vectors endpoint with sample data
        print("\n🤖 Testing vector generation...")
        sample_refs = [
            {"id": "test_ref_001", "title": "Tennis", "type": "sport"},
            {"id": "test_ref_002", "title": "Pool", "type": "game"}
        ]
        
        try:
            response = requests.post(
                'http://localhost:8000/generate-vectors',
                json={"refs": sample_refs},
                timeout=30
            )
            print(f"Vector generation: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                # Check if vectors were created
                vector_result = supabase.table('ref_vectors').select('*').execute()
                print(f"✅ Created {len(vector_result.data)} vectors in database")
                return True
            else:
                print(f"❌ Vector generation failed")
                return False
                
        except Exception as e:
            print(f"❌ Vector generation request failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    test_vector_generation() 