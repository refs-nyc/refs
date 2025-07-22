#!/usr/bin/env python3
"""
Test the current personality system with existing schema
"""

import os
import json
import requests
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def setup_minimal_test_data():
    """Add minimal test data that works with current schema"""
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🚀 Setting up minimal test data...")
    
    # Test user
    test_user = {
        'user_id': 'test_user_456',
        'name': 'Test User 2',
        'username': 'testuser2',
        'avatar_url': 'https://example.com/avatar2.jpg',
        'email': 'test2@example.com'
    }
    
    # Test refs
    test_refs = [
        {
            'id': 'chess_ref_001',
            'title': 'Chess',
            'image': 'https://example.com/chess.jpg',
            'creator': 'system',
            'type': 'game'
        },
        {
            'id': 'coffee_ref_002', 
            'title': 'Coffee',
            'image': 'https://example.com/coffee.jpg',
            'creator': 'system',
            'type': 'beverage'
        }
    ]
    
    # Test user-ref relationships (without caption for now)
    test_user_refs = [
        {
            'user_id': 'test_user_456',
            'ref_id': 'chess_ref_001'
        },
        {
            'user_id': 'test_user_456',
            'ref_id': 'coffee_ref_002'
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
            print(f"✅ User-ref added: {user_ref['ref_id']}")
        
        print("🎉 Minimal test data setup complete!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up test data: {e}")
        return False

def test_current_api():
    """Test the current API endpoints"""
    
    print("\n🧠 Testing current API endpoints...")
    
    api_base = "http://localhost:8000"
    
    # Test health endpoint
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{api_base}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        return False
    
    # Test search endpoint with existing user
    print("\n🔍 Testing people search...")
    try:
        search_data = {
            'user_id': 'rpr8bjg26q72z81',  # Existing user
            'user_refs': ['Chess', 'Coffee', 'Books'],
            'page': 1
        }
        
        response = requests.post(f"{api_base}/search_people", json=search_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Search successful! Found {len(result.get('people', []))} people")
            print(f"   Title: {result.get('search_title', 'N/A')}")
            if result.get('people'):
                print(f"   First result: {result['people'][0].get('name', 'Unknown')}")
        else:
            print(f"❌ Search failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error calling search API: {e}")
    
    # Test personality generation endpoint  
    print("\n🎭 Testing personality generation...")
    try:
        personality_data = {
            'user_id': 'rpr8bjg26q72z81'
        }
        
        response = requests.post(f"{api_base}/generate-user-personality", json=personality_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Personality generation successful!")
            print(f"   Summary: {result.get('personality_summary', 'N/A')[:100]}...")
        else:
            print(f"❌ Personality generation failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error calling personality API: {e}")

def check_database_status():
    """Check the current database status"""
    
    print("\n📊 Checking database status...")
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    tables_to_check = [
        'users',
        'refs', 
        'user_refs',
        'user_personalities',
        'ref_vectors'
    ]
    
    for table in tables_to_check:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            count_result = supabase.table(table).select('*', count='exact').execute()
            count = count_result.count if hasattr(count_result, 'count') else 'unknown'
            print(f"✅ {table}: exists ({count} rows)")
        except Exception as e:
            print(f"❌ {table}: error - {str(e)[:50]}...")
    
    # Check for missing table
    try:
        result = supabase.table('user_ref_personalities').select('*').limit(1).execute()
        print(f"✅ user_ref_personalities: exists")
    except Exception as e:
        print(f"❌ user_ref_personalities: missing - {str(e)[:50]}...")

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Missing required environment variables: SUPA_URL, SUPA_KEY")
        exit(1)
    
    print("🎯 Testing Current System Status")
    print("=" * 50)
    
    # Check database status
    check_database_status()
    
    # Setup minimal test data
    print("\n" + "=" * 50)
    setup_minimal_test_data()
    
    # Test API
    print("\n" + "=" * 50)
    test_current_api()
    
    print("\n" + "=" * 50)
    print("🎉 Testing complete!")
    print("\n📋 To finish setup:")
    print("1. Run this SQL in Supabase dashboard:")
    print("   ALTER TABLE user_refs ADD COLUMN IF NOT EXISTS caption TEXT;")
    print("   CREATE TABLE user_ref_personalities (...); -- see fix_database_schema.sql")
    print("2. Restart the search API")
    print("3. Test the per-ref personality features!") 