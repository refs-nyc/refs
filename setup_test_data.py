#!/usr/bin/env python3
"""
Setup test data and test the per-ref personality system
"""

import os
import json
import requests
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def setup_test_data():
    """Add test data to existing tables"""
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🚀 Setting up test data...")
    
    # Test user
    test_user = {
        'user_id': 'test_user_123',
        'name': 'Test User',
        'username': 'testuser',
        'avatar_url': 'https://example.com/avatar.jpg',
        'email': 'test@example.com'
    }
    
    # Test refs
    test_refs = [
        {
            'id': 'tennis_ref_001',
            'title': 'Tennis',
            'image': 'https://example.com/tennis.jpg',
            'creator': 'system',
            'type': 'sport'
        },
        {
            'id': 'jazz_ref_002', 
            'title': 'Jazz Music',
            'image': 'https://example.com/jazz.jpg',
            'creator': 'system',
            'type': 'music'
        },
        {
            'id': 'philosophy_ref_003',
            'title': 'Philosophy',
            'image': 'https://example.com/philosophy.jpg', 
            'creator': 'system',
            'type': 'academic'
        }
    ]
    
    # Test user-ref relationships with captions
    test_user_refs = [
        {
            'user_id': 'test_user_123',
            'ref_id': 'tennis_ref_001',
            'caption': 'Love the strategic mindset and competitive nature'
        },
        {
            'user_id': 'test_user_123',
            'ref_id': 'jazz_ref_002', 
            'caption': 'The improvisation speaks to my creative soul'
        },
        {
            'user_id': 'test_user_123',
            'ref_id': 'philosophy_ref_003',
            'caption': ''  # No caption - should use contextual generation
        }
    ]
    
    try:
        # Insert test user
        print("📝 Adding test user...")
        user_result = supabase.table('users').upsert(test_user).execute()
        print(f"✅ User added: {test_user['name']}")
        
        # Insert test refs
        print("📚 Adding test refs...")
        for ref in test_refs:
            ref_result = supabase.table('refs').upsert(ref).execute()
            print(f"✅ Ref added: {ref['title']}")
        
        # Insert user-ref relationships
        print("🔗 Adding user-ref relationships...")
        for user_ref in test_user_refs:
            ur_result = supabase.table('user_refs').upsert(user_ref).execute()
            caption_note = f" (caption: '{user_ref['caption']}')" if user_ref['caption'] else " (no caption)"
            print(f"✅ User-ref added: {user_ref['ref_id']}{caption_note}")
        
        print("🎉 Test data setup complete!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up test data: {e}")
        return False

def test_personality_generation():
    """Test the per-ref personality generation"""
    
    print("\n🧠 Testing per-ref personality generation...")
    
    # Test the API endpoints
    api_base = "http://localhost:8000"
    
    # Test personality generation for each ref
    test_cases = [
        {
            'user_id': 'test_user_123',
            'ref_id': 'tennis_ref_001',
            'ref_title': 'Tennis',
            'caption': 'Love the strategic mindset and competitive nature'
        },
        {
            'user_id': 'test_user_123', 
            'ref_id': 'jazz_ref_002',
            'ref_title': 'Jazz Music',
            'caption': 'The improvisation speaks to my creative soul'
        },
        {
            'user_id': 'test_user_123',
            'ref_id': 'philosophy_ref_003', 
            'ref_title': 'Philosophy',
            'caption': ''  # No caption - should use existing personality context
        }
    ]
    
    for i, case in enumerate(test_cases):
        print(f"\n📝 Test case {i+1}: {case['ref_title']}")
        print(f"   Caption: '{case['caption']}'" if case['caption'] else "   No caption provided")
        
        try:
            response = requests.post(
                f"{api_base}/generate-ref-personality",
                json=case
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Generated personality: {result['personality_sentence']}")
            else:
                print(f"❌ API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error calling API: {e}")
    
    # Test composite personality generation
    print(f"\n🎭 Testing composite personality generation...")
    try:
        response = requests.post(
            f"{api_base}/generate-user-personality",
            json={'user_id': 'test_user_123'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Composite personality: {result['personality_summary']}")
        else:
            print(f"❌ API error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Missing required environment variables: SUPA_URL, SUPA_KEY")
        exit(1)
    
    # Setup test data
    if setup_test_data():
        print("\n" + "="*50)
        print("🎯 Test data is ready!")
        print("📋 Next steps:")
        print("1. Make sure the search API is running on port 8000")
        print("2. Run: python3 setup_test_data.py to test personality generation")
        print("3. Or run individual API calls to test functionality")
        print("\n💡 The system is ready to test per-ref personalities!")
    else:
        print("⚠️  Failed to setup test data. Check errors above.") 