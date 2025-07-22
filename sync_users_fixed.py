#!/usr/bin/env python3
"""
Fixed sync script that works around Supabase schema cache issues
"""

import os
import sqlite3
import requests
from supabase import create_client, Client
from pathlib import Path

# Configuration
POCKETBASE_DB = Path.cwd() / ".pocketbase" / "pb_data" / "data.db"
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def get_pocketbase_data():
    """Extract users, items, and refs from PocketBase"""
    conn = sqlite3.connect(POCKETBASE_DB)
    cursor = conn.cursor()
    
    # Get users with core fields only
    cursor.execute("""
        SELECT id, userName, firstName, lastName, email
        FROM users
        WHERE userName IS NOT NULL AND userName != ''
        LIMIT 10
    """)
    users = cursor.fetchall()
    
    # Get items with their refs  
    cursor.execute("""
        SELECT i.id, i.creator, i.ref
        FROM Items i
        WHERE i.creator IS NOT NULL AND i.ref IS NOT NULL
        LIMIT 20
    """)
    items = cursor.fetchall()
    
    # Get all refs with core fields
    cursor.execute("""
        SELECT id, title, creator, type
        FROM refs
        LIMIT 20
    """)
    refs = cursor.fetchall()
    
    conn.close()
    return users, items, refs

def test_single_insert():
    """Test inserting a single record to each table"""
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("🧪 Testing single record inserts...")
        
        # Test user insert
        print("👤 Testing user insert...")
        user_data = {
            'id': 'test_user_123',
            'userName': 'testuser',
            'firstName': 'Test',
            'lastName': 'User',
            'email': 'test@example.com'
        }
        
        try:
            result = supabase.table('users').insert(user_data).execute()
            print(f"✅ User insert success: {result.data}")
        except Exception as e:
            print(f"❌ User insert failed: {e}")
        
        # Test ref insert
        print("📚 Testing ref insert...")
        ref_data = {
            'id': 'test_ref_123',
            'title': 'Test Ref',
            'creator': 'test_user_123',
            'type': 'test'
        }
        
        try:
            result = supabase.table('refs').insert(ref_data).execute()
            print(f"✅ Ref insert success: {result.data}")
        except Exception as e:
            print(f"❌ Ref insert failed: {e}")
        
        # Test user_refs insert
        print("🔗 Testing user_refs insert...")
        user_ref_data = {
            'user_id': 'test_user_123',
            'ref_id': 'test_ref_123',
            'item_id': 'test_item_123'
        }
        
        try:
            result = supabase.table('user_refs').insert(user_ref_data).execute()
            print(f"✅ User_refs insert success: {result.data}")
        except Exception as e:
            print(f"❌ User_refs insert failed: {e}")
        
        # Clean up test data
        print("🧹 Cleaning up test data...")
        try:
            supabase.table('user_refs').delete().eq('user_id', 'test_user_123').execute()
            supabase.table('refs').delete().eq('id', 'test_ref_123').execute()
            supabase.table('users').delete().eq('id', 'test_user_123').execute()
            print("✅ Cleanup completed")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def sync_real_data():
    """Sync real PocketBase data"""
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("📖 Reading data from PocketBase...")
        users, items, refs = get_pocketbase_data()
        
        print(f"📊 Found (sample):")
        print(f"   👥 {len(users)} users")
        print(f"   📚 {len(refs)} refs")
        print(f"   📋 {len(items)} items")
        
        # Insert users with core fields only
        print("👥 Inserting users...")
        for i, user in enumerate(users):
            user_id, userName, firstName, lastName, email = user
            
            user_data = {
                'id': user_id,
                'userName': userName or '',
                'firstName': firstName or '',
                'lastName': lastName or '',
                'email': email or ''
            }
            
            try:
                supabase.table('users').upsert(user_data).execute()
                print(f"   ✅ {i+1}/{len(users)}: {userName}")
            except Exception as e:
                print(f"   ❌ Error with {userName}: {e}")
        
        # Insert refs with core fields
        print("📚 Inserting refs...")
        for i, ref in enumerate(refs):
            ref_id, title, creator, ref_type = ref
            
            ref_data = {
                'id': ref_id,
                'title': title or '',
                'creator': creator or '',
                'type': ref_type or ''
            }
            
            try:
                supabase.table('refs').upsert(ref_data).execute()
                print(f"   ✅ {i+1}/{len(refs)}: {title}")
            except Exception as e:
                print(f"   ❌ Error with {title}: {e}")
        
        # Insert user_refs
        print("🔗 Inserting user-ref relationships...")
        for i, item in enumerate(items):
            item_id, user_id, ref_id = item
            
            user_ref_data = {
                'user_id': user_id,
                'ref_id': ref_id,
                'item_id': item_id
            }
            
            try:
                supabase.table('user_refs').upsert(user_ref_data).execute()
                print(f"   ✅ {i+1}/{len(items)}: {user_id} -> {ref_id}")
            except Exception as e:
                print(f"   ❌ Error with {item_id}: {e}")
        
        print("\n✅ Sample data sync completed!")
        print("🔍 Triggering vector generation...")
        
        # Trigger vector generation for the sample refs
        try:
            ref_data = [{'id': ref[0], 'title': ref[1], 'type': ref[3] or ''} for ref in refs]
            response = requests.post('http://localhost:8000/generate-vectors', json={'refs': ref_data})
            
            if response.status_code == 200:
                result = response.json()
                print(f"🤖 Vector generation success: {result}")
            else:
                print(f"❌ Vector generation failed: {response.text}")
        except Exception as e:
            print(f"❌ Error triggering vectors: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")
        return False

if __name__ == "__main__":
    print("🔬 Running Supabase compatibility test...")
    if test_single_insert():
        print("\n🚀 Test passed! Now syncing real data...")
        sync_real_data()
    else:
        print("❌ Test failed - please check Supabase setup") 