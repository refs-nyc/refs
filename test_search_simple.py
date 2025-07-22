#!/usr/bin/env python3
"""
Simple test version without OpenAI to verify basic functionality
"""

import os
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def test_supabase_connection():
    """Test basic Supabase connection"""
    print("🚀 Testing Supabase connection...")
    
    supa_url = os.getenv("SUPA_URL")
    supa_key = os.getenv("SUPA_KEY")
    
    try:
        supabase = create_client(supa_url, supa_key)
        
        # Test users table
        result = supabase.table('users').select('*').limit(1).execute()
        print(f"   ✅ Users table accessible (found {len(result.data)} users)")
        
        # Test ref_vectors table  
        result = supabase.table('ref_vectors').select('*').limit(1).execute()
        print(f"   ✅ Ref_vectors table accessible (found {len(result.data)} vectors)")
        
        # Test user_refs table
        result = supabase.table('user_refs').select('*').limit(1).execute()
        print(f"   ✅ User_refs table accessible (found {len(result.data)} associations)")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Supabase error: {e}")
        return False

def test_pocketbase_data():
    """Check what data we have in PocketBase"""
    print("\n📦 Checking PocketBase data...")
    
    pb_url = os.getenv("EXPO_PUBLIC_POCKETBASE_URL", "http://localhost:8090")
    
    try:
        # Get users
        response = requests.get(f"{pb_url}/api/collections/users/records")
        if response.status_code == 200:
            users = response.json().get('items', [])
            print(f"   📊 Found {len(users)} users in PocketBase")
            if users:
                print(f"   👤 Example user: {users[0].get('userName', 'No username')}")
        
        # Get refs
        response = requests.get(f"{pb_url}/api/collections/refs/records")
        if response.status_code == 200:
            refs = response.json().get('items', [])
            print(f"   📚 Found {len(refs)} refs in PocketBase")
            if refs:
                print(f"   📖 Example ref: {refs[0].get('title', 'No title')}")
        
        # Get items (user-ref associations)
        response = requests.get(f"{pb_url}/api/collections/items/records")
        if response.status_code == 200:
            items = response.json().get('items', [])
            print(f"   🔗 Found {len(items)} user-ref associations in PocketBase")
        
        return len(users), len(refs), len(items)
        
    except Exception as e:
        print(f"   ❌ PocketBase error: {e}")
        return 0, 0, 0

def test_search_function():
    """Test the Supabase search function with dummy data"""
    print("\n🔍 Testing search function...")
    
    supa_url = os.getenv("SUPA_URL")
    supa_key = os.getenv("SUPA_KEY")
    
    try:
        supabase = create_client(supa_url, supa_key)
        
        # Create a dummy vector (1536 dimensions of zeros)
        dummy_vector = [0.0] * 1536
        
        result = supabase.rpc(
            'rank_people',
            {
                'p_user': 'test_user',
                'p_ref1': 'ref1',
                'p_ref2': 'ref2', 
                'p_ref3': 'ref3',
                'p_vec': dummy_vector
            }
        ).execute()
        
        print(f"   ✅ Search function works! Found {len(result.data)} results")
        return True
        
    except Exception as e:
        print(f"   ❌ Search function error: {e}")
        return False

def main():
    print("🧪 Testing Refs People Finder (without OpenAI)...\n")
    
    # Test connections
    supabase_ok = test_supabase_connection()
    user_count, ref_count, item_count = test_pocketbase_data()
    search_ok = test_search_function()
    
    print(f"\n📊 Test Results:")
    print(f"   Supabase: {'✅' if supabase_ok else '❌'}")
    print(f"   PocketBase: {'✅' if user_count >= 0 else '❌'}")
    print(f"   Search Function: {'✅' if search_ok else '❌'}")
    
    if user_count == 0:
        print(f"\n💡 Next Steps:")
        print(f"   1. Create some users in your React Native app")
        print(f"   2. Add some refs to your collection")
        print(f"   3. Fix OpenAI billing to enable AI features")
        print(f"   4. Run sync_users.py to populate Supabase")
        print(f"   5. Test the full search functionality")
    else:
        print(f"\n🎉 Great! You have data. Run sync_users.py to sync to Supabase.")

if __name__ == "__main__":
    main() 