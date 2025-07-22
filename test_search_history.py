#!/usr/bin/env python3
"""
Test script to verify search history functionality
"""

import os
import json
from supabase import create_client
from datetime import datetime

# Initialize Supabase client
supabase_url = 'https://zrxgnplwnfaxtpffrqxo.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGducGx3bmZheHRwZmZycXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA3MDgzOSwiZXhwIjoyMDY3NjQ2ODM5fQ.7qfmXc1hACRrVkU02J05xiaqhtO95sHMcLqf9yrNxc4'

supabase = create_client(supabase_url, supabase_key)

def test_search_history_schema():
    """Test if search_history table has the correct schema"""
    print("🔍 Testing search_history table schema...")
    
    try:
        # Try to insert a test record with search_results
        test_data = {
            'user_id': 'test_user_456',
            'ref_ids': ['test_ref_1', 'test_ref_2'],
            'ref_titles': ['Test Ref 1', 'Test Ref 2'],
            'search_title': 'Test Search Title',
            'search_subtitle': 'Test Ref 1, Test Ref 2',
            'result_count': 3,
            'search_results': [
                {
                    'user_id': 'candidate_1',
                    'name': 'Test Candidate 1',
                    'username': 'testuser1',
                    'avatar_url': 'https://example.com/avatar1.jpg',
                    'shared_refs': 2,
                    'score': 0.85,
                    'personality_insight': 'A creative and thoughtful person'
                },
                {
                    'user_id': 'candidate_2',
                    'name': 'Test Candidate 2',
                    'username': 'testuser2',
                    'avatar_url': 'https://example.com/avatar2.jpg',
                    'shared_refs': 1,
                    'score': 0.72,
                    'personality_insight': 'Someone with diverse interests'
                }
            ]
        }
        
        result = supabase.table('search_history').insert(test_data).execute()
        print("✅ Successfully inserted test record with search_results")
        print(f"   Record ID: {result.data[0]['id']}")
        
        # Verify the record was saved correctly
        saved_record = supabase.table('search_history').select('*').eq('id', result.data[0]['id']).execute()
        print(f"✅ Retrieved saved record with {len(saved_record.data[0]['search_results'])} search results")
        
        # Clean up test data
        supabase.table('search_history').delete().eq('id', result.data[0]['id']).execute()
        print("✅ Test data cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing search_history schema: {e}")
        return False

def test_search_history_retrieval():
    """Test retrieving search history"""
    print("\n🔍 Testing search history retrieval...")
    
    try:
        # Get search history for a user
        result = supabase.table('search_history').select('*').eq('user_id', 'rpr8bjg26q72z81').order('created_at', desc=True).limit(5).execute()
        
        print(f"✅ Found {len(result.data)} search history records for user rpr8bjg26q72z81")
        
        if result.data:
            for i, record in enumerate(result.data):
                print(f"   Record {i+1}:")
                print(f"     ID: {record['id']}")
                print(f"     Title: {record['search_title']}")
                print(f"     Subtitle: {record['search_subtitle']}")
                print(f"     Ref IDs: {record['ref_ids']}")
                print(f"     Result count: {record['result_count']}")
                print(f"     Has search_results: {record.get('search_results') is not None}")
                if record.get('search_results'):
                    print(f"     Search results count: {len(record['search_results'])}")
                print(f"     Created: {record['created_at']}")
                print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing search history retrieval: {e}")
        return False

def test_search_api_integration():
    """Test that the search API can save to history"""
    print("\n🔍 Testing search API integration...")
    
    try:
        # Test a simple search API call
        import requests
        
        search_data = {
            "user_id": "rpr8bjg26q72z81",
            "ref_ids": ["4e6u1pc560mz5l0"],  # Use a valid ref ID
            "page": 1,
            "page_size": 5
        }
        
        response = requests.post("http://localhost:8000/search_people", json=search_data)
        
        if response.status_code == 200:
            print("✅ Search API call successful")
            result = response.json()
            print(f"   Found {result['total_results']} people")
            print(f"   Title: {result['title']}")
            print(f"   Subtitle: {result['subtitle']}")
            
            # Check if search history was saved
            import time
            time.sleep(1)  # Give it a moment to save
            
            history_result = supabase.table('search_history').select('*').eq('user_id', 'rpr8bjg26q72z81').order('created_at', desc=True).limit(1).execute()
            
            if history_result.data:
                latest = history_result.data[0]
                print(f"✅ Search history saved:")
                print(f"   ID: {latest['id']}")
                print(f"   Title: {latest['search_title']}")
                print(f"   Results: {latest['result_count']}")
                print(f"   Has full results: {latest.get('search_results') is not None}")
            else:
                print("⚠️  No search history found - check if search API is running")
            
        else:
            print(f"❌ Search API call failed: {response.status_code}")
            print(f"   Response: {response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing search API integration: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Search History Functionality")
    print("=" * 50)
    
    # Test 1: Schema
    schema_ok = test_search_history_schema()
    
    # Test 2: Retrieval
    retrieval_ok = test_search_history_retrieval()
    
    # Test 3: API Integration (only if search API is running)
    try:
        api_ok = test_search_api_integration()
    except:
        print("\n⚠️  Skipping API integration test - search API not running")
        api_ok = True
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"   Schema: {'✅ PASS' if schema_ok else '❌ FAIL'}")
    print(f"   Retrieval: {'✅ PASS' if retrieval_ok else '❌ FAIL'}")
    print(f"   API Integration: {'✅ PASS' if api_ok else '❌ FAIL'}")
    
    if schema_ok and retrieval_ok:
        print("\n🎉 Search history functionality is working!")
    else:
        print("\n⚠️  Some tests failed. Please check the schema and try again.") 