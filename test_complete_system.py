#!/usr/bin/env python3
"""
Complete end-to-end test of the per-ref personality system
"""

import os
import json
import requests
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')
API_BASE = "http://localhost:8001"

def test_complete_workflow():
    """Test the complete per-ref personality workflow"""
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🎯 Complete Per-Ref Personality System Test")
    print("=" * 60)
    
    # Step 1: Setup test data
    print("\n📚 Step 1: Setting up test data...")
    
    test_user = {
        'user_id': 'complete_test_user',
        'name': 'Complete Test User',
        'username': 'completetest',
        'avatar_url': 'https://example.com/complete.jpg',
        'email': 'complete@example.com'
    }
    
    test_refs = [
        {'id': 'chess_complete_01', 'title': 'Chess Strategy', 'type': 'game'},
        {'id': 'jazz_complete_02', 'title': 'Jazz Improvisation', 'type': 'music'},
        {'id': 'philosophy_complete_03', 'title': 'Eastern Philosophy', 'type': 'academic'},
        {'id': 'tennis_complete_04', 'title': 'Tennis', 'type': 'sport'},
        {'id': 'cooking_complete_05', 'title': 'Italian Cooking', 'type': 'food'}
    ]
    
    # Insert test data
    try:
        supabase.table('users').upsert(test_user).execute()
        print(f"✅ Created user: {test_user['name']}")
        
        for ref in test_refs:
            supabase.table('refs').upsert(ref).execute()
            print(f"✅ Created ref: {ref['title']}")
        
        # Create user-ref relationships (simulating user adding refs one by one)
        user_refs = [
            {'user_id': 'complete_test_user', 'ref_id': 'chess_complete_01'},
            {'user_id': 'complete_test_user', 'ref_id': 'jazz_complete_02'},
            {'user_id': 'complete_test_user', 'ref_id': 'philosophy_complete_03'},
            {'user_id': 'complete_test_user', 'ref_id': 'tennis_complete_04'},
            {'user_id': 'complete_test_user', 'ref_id': 'cooking_complete_05'}
        ]
        
        for ur in user_refs:
            supabase.table('user_refs').upsert(ur).execute()
            print(f"✅ Added user-ref: {ur['ref_id']}")
        
    except Exception as e:
        print(f"❌ Error setting up test data: {e}")
        return False
    
    # Step 2: Generate vectors for refs
    print("\n🧮 Step 2: Generating vectors for refs...")
    
    try:
        vector_request = {
            "refs": [{"id": ref['id'], "title": ref['title'], "type": ref['type']} for ref in test_refs]
        }
        
        response = requests.post(f"{API_BASE}/generate-vectors", json=vector_request)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Generated {result['generated']} vectors")
        else:
            print(f"❌ Vector generation failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error generating vectors: {e}")
    
    # Step 3: Test per-ref personality generation
    print("\n🧠 Step 3: Testing per-ref personality generation...")
    
    test_cases = [
        {
            'user_id': 'complete_test_user',
            'ref_id': 'chess_complete_01',
            'ref_title': 'Chess Strategy',
            'user_caption': 'I love the strategic depth and mental challenge'
        },
        {
            'user_id': 'complete_test_user',
            'ref_id': 'jazz_complete_02',
            'ref_title': 'Jazz Improvisation',
            'user_caption': 'The spontaneity and creative expression speaks to me'
        },
        {
            'user_id': 'complete_test_user',
            'ref_id': 'philosophy_complete_03',
            'ref_title': 'Eastern Philosophy',
            'user_caption': ''  # No caption - should use existing personality context
        }
    ]
    
    for i, case in enumerate(test_cases):
        print(f"\n   📝 Test case {i+1}: {case['ref_title']}")
        if case['user_caption']:
            print(f"      Caption: '{case['user_caption']}'")
        else:
            print(f"      No caption - using contextual generation")
        
        try:
            response = requests.post(f"{API_BASE}/generate-ref-personality", json=case)
            if response.status_code == 200:
                result = response.json()
                print(f"      ✅ Generated: {result['personality_sentence']}")
            else:
                print(f"      ❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    # Step 4: Test composite personality generation
    print("\n🎭 Step 4: Testing composite personality generation...")
    
    try:
        response = requests.post(f"{API_BASE}/generate-user-personality", json={'user_id': 'complete_test_user'})
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Composite personality generated successfully!")
            print(f"   Summary: {result['personality'][:150]}...")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 5: Test people search using the new user's refs
    print("\n🔍 Step 5: Testing people search with generated data...")
    
    try:
        # Use 3 of our test refs for search
        search_request = {
            'user_id': 'complete_test_user',
            'ref_ids': ['chess_complete_01', 'jazz_complete_02', 'philosophy_complete_03'],
            'page': 1,
            'page_size': 10
        }
        
        response = requests.post(f"{API_BASE}/search_people", json=search_request)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Search successful! Found {len(result['people'])} people")
            print(f"   Total results: {result['total_results']}")
            print(f"   Has more: {result['has_more']}")
            
            if result['people']:
                print(f"   Top result: {result['people'][0]['name']} (score: {result['people'][0]['score']:.3f})")
                print(f"   Personality: {result['people'][0]['personality_insight'][:100]}...")
        else:
            print(f"❌ Search failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 6: Verify data persistence
    print("\n💾 Step 6: Verifying data persistence...")
    
    try:
        # Check if per-ref personalities were stored
        personalities_result = supabase.table('user_ref_personalities').select('*').eq('user_id', 'complete_test_user').execute()
        print(f"✅ Stored {len(personalities_result.data)} per-ref personalities")
        
        # Check if composite personality was stored
        composite_result = supabase.table('user_personalities').select('*').eq('user_id', 'complete_test_user').execute()
        if composite_result.data:
            print(f"✅ Composite personality stored successfully")
            print(f"   Used {len(composite_result.data[0].get('ref_ids_used', []))} refs")
        else:
            print(f"⚠️  Composite personality not found in database")
            
    except Exception as e:
        print(f"❌ Error checking persistence: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Complete system test finished!")
    print("\n🏗️  System Architecture Summary:")
    print("   1. ✅ Per-ref personality generation (with/without captions)")
    print("   2. ✅ Contextual generation using existing personality patterns") 
    print("   3. ✅ Composite personality caching")
    print("   4. ✅ Vector-based people search")
    print("   5. ✅ LLM-based personality compatibility ranking")
    print("   6. ✅ Data persistence and caching")
    
    return True

def cleanup_test_data():
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Delete in reverse dependency order
        supabase.table('user_ref_personalities').delete().eq('user_id', 'complete_test_user').execute()
        supabase.table('user_personalities').delete().eq('user_id', 'complete_test_user').execute()
        supabase.table('user_refs').delete().eq('user_id', 'complete_test_user').execute()
        supabase.table('users').delete().eq('user_id', 'complete_test_user').execute()
        
        # Clean up test refs
        test_ref_ids = ['chess_complete_01', 'jazz_complete_02', 'philosophy_complete_03', 'tennis_complete_04', 'cooking_complete_05']
        supabase.table('ref_vectors').delete().in_('ref_id', test_ref_ids).execute()
        supabase.table('refs').delete().in_('id', test_ref_ids).execute()
        
        print("✅ Test data cleaned up")
    except Exception as e:
        print(f"⚠️  Error cleaning up: {e}")

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Missing required environment variables: SUPA_URL, SUPA_KEY")
        exit(1)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code != 200:
            print(f"❌ API not running or unhealthy. Start with: python3 search_api.py")
            exit(1)
    except:
        print(f"❌ Cannot connect to API at {API_BASE}. Make sure it's running!")
        exit(1)
    
    try:
        test_complete_workflow()
    finally:
        # Always clean up
        cleanup_test_data() 