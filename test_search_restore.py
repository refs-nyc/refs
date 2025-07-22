#!/usr/bin/env python3
"""
Test script to verify search history restore functionality
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8001"
USER_ID = "rpr8bjg26q72z81"

def test_search_and_restore():
    """Test the complete search and restore flow"""
    
    print("🧪 Testing Search History Restore Functionality")
    print("=" * 50)
    
    # Step 1: Run a search
    print("\n1️⃣ Running a new search...")
    search_data = {
        "user_id": USER_ID,
        "ref_ids": ["chess_ref_001", "jazz_ref_002"],
        "page": 1,
        "page_size": 20
    }
    
    response = requests.post(f"{BASE_URL}/search_people", json=search_data)
    if response.status_code == 200:
        search_results = response.json()
        print(f"✅ Search successful: {len(search_results['people'])} people found")
        print(f"   Title: {search_results['title']}")
        print(f"   Subtitle: {search_results['subtitle']}")
    else:
        print(f"❌ Search failed: {response.status_code}")
        return False
    
    # Step 2: Check search history
    print("\n2️⃣ Checking search history...")
    response = requests.get(f"{BASE_URL}/search-history/{USER_ID}")
    if response.status_code == 200:
        history = response.json()
        if history['history']:
            latest_search = history['history'][0]
            print(f"✅ Found {len(history['history'])} search history items")
            print(f"   Latest search ID: {latest_search['id']}")
            print(f"   Ref IDs: {latest_search['ref_ids']}")
            print(f"   Results saved: {len(latest_search.get('search_results', []))}")
            history_id = latest_search['id']
        else:
            print("❌ No search history found")
            return False
    else:
        print(f"❌ Failed to get search history: {response.status_code}")
        return False
    
    # Step 3: Restore the search
    print("\n3️⃣ Restoring search from history...")
    response = requests.get(f"{BASE_URL}/search-history/{USER_ID}/restore/{history_id}")
    if response.status_code == 200:
        restored_results = response.json()
        print(f"✅ Restore successful: {len(restored_results['people'])} people restored")
        print(f"   Title: {restored_results['title']}")
        print(f"   Subtitle: {restored_results['subtitle']}")
        
        # Verify the results match
        if (len(restored_results['people']) == len(search_results['people']) and
            restored_results['title'] == search_results['title'] and
            restored_results['subtitle'] == search_results['subtitle']):
            print("✅ Restored results match original search exactly!")
        else:
            print("❌ Restored results don't match original search")
            return False
    else:
        print(f"❌ Restore failed: {response.status_code}")
        return False
    
    print("\n🎉 All tests passed! Search history restore is working correctly.")
    return True

if __name__ == "__main__":
    test_search_and_restore() 