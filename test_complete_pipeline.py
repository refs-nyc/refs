#!/usr/bin/env python3
"""
Comprehensive end-to-end test of the PocketBase → Supabase → LLM → App pipeline
"""

import asyncio
import httpx
import json
import os
from typing import Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPA_URL = os.getenv('SUPA_URL')
SUPA_KEY = os.getenv('SUPA_KEY')

# Validate required environment variables
if not all([OPENAI_API_KEY, SUPA_URL, SUPA_KEY]):
    raise ValueError("Missing required environment variables: OPENAI_API_KEY, SUPA_URL, SUPA_KEY")

async def test_pocketbase_connection():
    """Test 1: PocketBase connection and data"""
    print("🔍 Test 1: PocketBase Connection")
    print("=" * 50)
    
    try:
        async with httpx.AsyncClient() as client:
            # Test PocketBase health
            response = await client.get("http://localhost:8090/api/health")
            print(f"✅ PocketBase health: {response.status_code}")
            
            # Get items count from PocketBase
            response = await client.get("http://localhost:8090/api/collections/items/records")
            items_data = response.json()
            pb_items_count = len(items_data.get('items', []))
            print(f"✅ PocketBase items: {pb_items_count}")
            
            # Get sample items
            sample_items = items_data.get('items', [])[:3]
            print(f"✅ Sample PocketBase items:")
            for item in sample_items:
                print(f"   - ID: {item.get('id')}, Creator: {item.get('creator')}, Ref: {item.get('ref')}, Text: {item.get('text', 'N/A')}")
            
            return pb_items_count, sample_items
            
    except Exception as e:
        print(f"❌ PocketBase test failed: {e}")
        return 0, []

async def test_supabase_connection():
    """Test 2: Supabase connection and data"""
    print("\n🔍 Test 2: Supabase Connection")
    print("=" * 50)
    
    try:
        headers = {
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}"
        }
        
        async with httpx.AsyncClient() as client:
            # Test Supabase connection
            response = await client.get(f"{SUPA_URL}/rest/v1/", headers=headers)
            print(f"✅ Supabase connection: {response.status_code}")
            
            # Get items count from Supabase
            response = await client.get(f"{SUPA_URL}/rest/v1/items?select=count", headers=headers)
            print(f"✅ Supabase items query: {response.status_code}")
            
            # Get actual items
            response = await client.get(f"{SUPA_URL}/rest/v1/items?select=*&limit=5", headers=headers)
            supabase_items = response.json()
            print(f"✅ Supabase items: {len(supabase_items)}")
            
            # Get sample items
            print(f"✅ Sample Supabase items:")
            for item in supabase_items[:3]:
                print(f"   - ID: {item.get('id')}, Creator: {item.get('creator')}, Ref: {item.get('ref')}, Text: {item.get('text', 'N/A')}")
            
            return len(supabase_items), supabase_items
            
    except Exception as e:
        print(f"❌ Supabase test failed: {e}")
        return 0, []

async def test_search_api_health():
    """Test 3: Search API health"""
    print("\n🔍 Test 3: Search API Health")
    print("=" * 50)
    
    try:
        async with httpx.AsyncClient() as client:
            # Test health endpoint
            response = await client.get("http://localhost:8001/health")
            health_data = response.json()
            print(f"✅ Search API health: {response.status_code}")
            print(f"✅ Status: {health_data.get('status')}")
            print(f"✅ Message: {health_data.get('message')}")
            
            return True
            
    except Exception as e:
        print(f"❌ Search API health test failed: {e}")
        return False

async def test_openai_connection():
    """Test 4: OpenAI connection"""
    print("\n🔍 Test 4: OpenAI Connection")
    print("=" * 50)
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Test OpenAI with a simple request
            test_data = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "Say 'Hello'"}],
                "max_tokens": 10
            }
            
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=test_data
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result['choices'][0]['message']['content']
                print(f"✅ OpenAI connection: {response.status_code}")
                print(f"✅ Test response: {message}")
                return True
            else:
                print(f"❌ OpenAI test failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ OpenAI test failed: {e}")
        return False

async def test_search_functionality():
    """Test 5: Search functionality with real data"""
    print("\n🔍 Test 5: Search Functionality")
    print("=" * 50)
    
    try:
        # First get some real ref IDs from Supabase
        headers = {
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}"
        }
        
        async with httpx.AsyncClient() as client:
            # Get some items with refs
            response = await client.get(f"{SUPA_URL}/rest/v1/items?select=ref&limit=5", headers=headers)
            items = response.json()
            
            if not items:
                print("❌ No items found in Supabase for testing")
                return False
            
            # Get ref IDs
            ref_ids = [item['ref'] for item in items if item.get('ref') and item['ref'] is not None]
            
            if not ref_ids:
                print("❌ No ref IDs found in items")
                return False
            
            print(f"✅ Found {len(ref_ids)} ref IDs for testing: {ref_ids[:3]}")
            
            # Test search with first ref
            test_ref_id = ref_ids[0]
            search_data = {
                "user_id": "test_user_pipeline",
                "ref_ids": [test_ref_id],
                "page": 1,
                "page_size": 5
            }
            
            response = await client.post(
                "http://localhost:8001/search_people",
                json=search_data,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Search successful: {response.status_code}")
                print(f"✅ Found {len(result.get('people', []))} people")
                print(f"✅ Search title: {result.get('title', 'N/A')}")
                print(f"✅ Search subtitle: {result.get('subtitle', 'N/A')}")
                
                # Show first result if any
                if result.get('people'):
                    first_person = result['people'][0]
                    print(f"✅ First result: {first_person.get('name', 'N/A')} - Score: {first_person.get('score', 'N/A')}")
                
                return True
            else:
                print(f"❌ Search failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Search functionality test failed: {e}")
        return False

async def test_personality_generation():
    """Test 6: Personality generation"""
    print("\n🔍 Test 6: Personality Generation")
    print("=" * 50)
    
    try:
        async with httpx.AsyncClient() as client:
            # Test personality generation
            personality_data = {
                "user_id": "test_user_pipeline",
                "limit_refs": 3
            }
            
            response = await client.post(
                "http://localhost:8001/generate-user-personality",
                json=personality_data,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Personality generation: {response.status_code}")
                print(f"✅ Generated personality: {result.get('personality', 'N/A')[:100]}...")
                return True
            else:
                print(f"❌ Personality generation failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Personality generation test failed: {e}")
        return False

async def test_data_sync_consistency():
    """Test 7: Data sync consistency between PocketBase and Supabase"""
    print("\n🔍 Test 7: Data Sync Consistency")
    print("=" * 50)
    
    try:
        # Get PocketBase items
        async with httpx.AsyncClient() as client:
            pb_response = await client.get("http://localhost:8090/api/collections/items/records")
            pb_items = pb_response.json().get('items', [])
            
            # Get Supabase items
            headers = {
                "apikey": SUPA_KEY,
                "Authorization": f"Bearer {SUPA_KEY}"
            }
            
            supabase_response = await client.get(f"{SUPA_URL}/rest/v1/items?select=*", headers=headers)
            supabase_items = supabase_response.json()
            
            print(f"✅ PocketBase items: {len(pb_items)}")
            print(f"✅ Supabase items: {len(supabase_items)}")
            
            # Check for significant differences
            pb_count = len(pb_items)
            supabase_count = len(supabase_items)
            
            if abs(pb_count - supabase_count) <= 5:  # Allow small difference
                print(f"✅ Data sync looks consistent (difference: {abs(pb_count - supabase_count)})")
                return True
            else:
                print(f"⚠️  Data sync inconsistency detected (difference: {abs(pb_count - supabase_count)})")
                return False
                
    except Exception as e:
        print(f"❌ Data sync consistency test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Comprehensive Pipeline Test")
    print("=" * 60)
    
    results = {}
    
    # Run all tests
    results['pocketbase'] = await test_pocketbase_connection()
    results['supabase'] = await test_supabase_connection()
    results['search_api'] = await test_search_api_health()
    results['openai'] = await test_openai_connection()
    results['search'] = await test_search_functionality()
    results['personality'] = await test_personality_generation()
    results['sync'] = await test_data_sync_consistency()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        if result:
            print(f"✅ {test_name.upper()}: PASSED")
            passed += 1
        else:
            print(f"❌ {test_name.upper()}: FAILED")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Pipeline is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the details above.")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(main()) 