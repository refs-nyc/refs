#!/usr/bin/env python3
"""
Test script for the new per-ref personality system
"""

import os
import requests
import json

# Configuration
API_BASE = "http://localhost:8000"
USER_ID = "rpr8bjg26q72z81"  # Test user

def test_generate_ref_personality():
    """Test generating personality for a specific user-ref relationship"""
    print("🧠 Testing per-ref personality generation...")
    
    # Test data - simulating a user adding refs with different caption scenarios
    test_cases = [
        {
            "user_id": USER_ID,
            "ref_id": "test_ref_tennis",
            "ref_title": "Tennis",
            "user_caption": "Love the strategic mindset and competitive nature of the game"
        },
        {
            "user_id": USER_ID,
            "ref_id": "test_ref_jazz",
            "ref_title": "Jazz Music",
            "user_caption": "The improvisation and creative freedom speaks to my soul"
        },
        {
            "user_id": USER_ID,
            "ref_id": "test_ref_philosophy",
            "ref_title": "Philosophy",
            "user_caption": ""  # No caption - should use existing personality context
        },
        {
            "user_id": USER_ID,
            "ref_id": "test_ref_cooking",
            "ref_title": "Cooking",
            "user_caption": ""  # No caption - should build on previous personalities
        },
        {
            "user_id": USER_ID,
            "ref_id": "test_ref_hiking",
            "ref_title": "Hiking",
            "user_caption": ""  # No caption - should consider established patterns
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case['ref_title']}")
        if test_case['user_caption']:
            print(f"   Caption: \"{test_case['user_caption']}\"")
        else:
            print(f"   Caption: (none - using personality context)")
        
        try:
            response = requests.post(f"{API_BASE}/generate-ref-personality", json=test_case)
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Generated: \"{result['personality_sentence']}\"")
            else:
                print(f"   ❌ Error {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
        
        # Small delay to show progression
        import time
        time.sleep(0.5)

def test_composite_personality():
    """Test generating composite personality from ref personalities"""
    print(f"\n🎭 Testing composite personality generation for user {USER_ID}...")
    
    try:
        response = requests.post(f"{API_BASE}/generate-user-personality", json={
            "user_id": USER_ID,
            "limit_refs": 12
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Composite personality: \"{result['personality']}\"")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def test_search_with_personalities():
    """Test search using the new personality system"""
    print(f"\n🔍 Testing search with per-ref personality insights...")
    
    # Use some test ref IDs (these would be real refs in the database)
    test_refs = ["test_ref_tennis", "test_ref_jazz", "test_ref_philosophy"]
    
    try:
        response = requests.post(f"{API_BASE}/search_people", json={
            "user_id": USER_ID,
            "ref_ids": test_refs,
            "page": 1,
            "page_size": 5
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Found {result['total_results']} people")
            
            for i, person in enumerate(result['people'], 1):
                print(f"   {i}. {person['name']} (shared refs: {person['shared_refs']})")
                print(f"      Personality: \"{person['personality_insight']}\"")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def check_api_health():
    """Check if the API is running"""
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Status: {result['status']} - {result['message']}")
            return True
        else:
            print(f"❌ API Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

def main():
    print("🚀 Testing Per-Ref Personality System")
    print("=" * 50)
    
    # Check if API is running
    if not check_api_health():
        print("\n💡 Make sure the API is running with:")
        print("   python3 search_api.py")
        return
    
    # Run tests
    test_generate_ref_personality()
    test_composite_personality()
    test_search_with_personalities()
    
    print("\n" + "=" * 50)
    print("🎯 Per-ref personality system architecture:")
    print("   1. Each user-ref gets a personality sentence")
    print("   2. WITH caption: Uses user's personal note + ref title")
    print("   3. WITHOUT caption: Uses existing personality patterns + ref associations")
    print("   4. Sentences are cached in user_ref_personalities table")
    print("   5. Composite personality combines top 12 ref sentences") 
    print("   6. LLM ranking uses composite personalities for compatibility")
    print("\n✨ This preserves granular insights while building contextual understanding!")
    print("💡 Each new ref addition learns from previous personality patterns!")

if __name__ == "__main__":
    main() 