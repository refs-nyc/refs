#!/usr/bin/env python3
"""
Sync users and their refs from PocketBase to Supabase for vector similarity search
"""

import os
import sqlite3
import requests
import json
from supabase import create_client, Client
from pathlib import Path

# Configuration
POCKETBASE_DB = Path.cwd() / ".pocketbase" / "pb_data" / "data.db"
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def get_supabase_client():
    """Get Supabase client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_pocketbase_data():
    """Extract users, items, and refs from PocketBase"""
    conn = sqlite3.connect(POCKETBASE_DB)
    cursor = conn.cursor()
    
    # Get users
    cursor.execute("""
        SELECT id, userName, firstName, lastName, email, image, location, lat, lon, created, updated
        FROM users
        WHERE userName IS NOT NULL AND userName != ''
    """)
    users = cursor.fetchall()
    user_columns = ['id', 'userName', 'firstName', 'lastName', 'email', 'image', 'location', 'lat', 'lon', 'created', 'updated']
    
    # Get items with their refs
    cursor.execute("""
        SELECT i.id, i.creator, i.ref, i.image, i.text, i.url, i.backlog, i."order", i.list, i.parent, i.created, i.updated,
               r.id as ref_id, r.title, r.image as ref_image, r.type, r.meta, r.url as ref_url
        FROM Items i
        LEFT JOIN refs r ON i.ref = r.id
        WHERE i.creator IS NOT NULL
    """)
    items = cursor.fetchall()
    item_columns = ['id', 'creator', 'ref', 'image', 'text', 'url', 'backlog', 'order', 'list', 'parent', 'created', 'updated',
                   'ref_id', 'ref_title', 'ref_image', 'ref_type', 'ref_meta', 'ref_url']
    
    # Get all refs
    cursor.execute("""
        SELECT id, title, image, creator, type, meta, url, showInTicker, created, updated
        FROM refs
    """)
    refs = cursor.fetchall()
    ref_columns = ['id', 'title', 'image', 'creator', 'type', 'meta', 'url', 'showInTicker', 'created', 'updated']
    
    conn.close()
    
    # Convert to dictionaries
    users_dict = [dict(zip(user_columns, user)) for user in users]
    items_dict = [dict(zip(item_columns, item)) for item in items]
    refs_dict = [dict(zip(ref_columns, ref)) for ref in refs]
    
    return users_dict, items_dict, refs_dict

def sync_users_to_supabase(supabase: Client, users):
    """Sync users to Supabase"""
    print(f"👥 Syncing {len(users)} users...")
    
    # Clear existing users
    try:
        supabase.table('users').delete().neq('id', 'nonexistent').execute()
        print("🗑️  Cleared existing users")
    except Exception as e:
        print(f"⚠️  Could not clear users: {e}")
    
    # Prepare users data with proper field mapping
    users_data = []
    for user in users:
        user_data = {
            'user_id': user['id'],
            'username': user['userName'],
            'name': f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or user['userName'],
            'email': user.get('email'),
            'avatar_url': user.get('image'),  # Map PocketBase 'image' to Supabase 'avatar_url'
            'created_at': user.get('created'),
            'updated_at': user.get('updated')
        }
        users_data.append(user_data)
    
    # Insert users in batches
    batch_size = 50
    for i in range(0, len(users_data), batch_size):
        batch = users_data[i:i + batch_size]
        try:
            supabase.table('users').insert(batch).execute()
            print(f"✅ Synced users {i+1}-{min(i+batch_size, len(users_data))}")
        except Exception as e:
            print(f"❌ Error syncing user batch {i+1}-{min(i+batch_size, len(users_data))}: {e}")

def sync_refs_to_supabase(supabase: Client, refs):
    """Sync refs to Supabase and prepare for vector generation"""
    print(f"📚 Syncing {len(refs)} refs...")
    
    # Clear existing refs
    try:
        supabase.table('refs').delete().neq('id', 'nonexistent').execute()
        print("🗑️  Cleared existing refs")
    except Exception as e:
        print(f"⚠️  Could not clear refs: {e}")
    
    # Insert refs in batches
    batch_size = 50
    for i in range(0, len(refs), batch_size):
        batch = refs[i:i + batch_size]
        try:
            supabase.table('refs').insert(batch).execute()
            print(f"✅ Synced refs {i+1}-{min(i+batch_size, len(refs))}")
        except Exception as e:
            print(f"❌ Error syncing ref batch {i+1}-{min(i+batch_size, len(refs))}: {e}")

def sync_user_refs_to_supabase(supabase: Client, items):
    """Sync user-ref relationships to Supabase"""
    print(f"🔗 Syncing {len(items)} user-ref relationships...")
    
    # Clear existing user_refs
    try:
        supabase.table('user_refs').delete().neq('id', 'nonexistent').execute()
        print("🗑️  Cleared existing user_refs")
    except Exception as e:
        print(f"⚠️  Could not clear user_refs: {e}")
    
    # Prepare user_refs data
    user_refs = []
    for item in items:
        if item['creator'] and item['ref']:
            user_refs.append({
                'user_id': item['creator'],
                'ref_id': item['ref'],
                'item_id': item['id'],
                'backlog': item['backlog'],
                'created': item['created']
            })
    
    print(f"📋 Prepared {len(user_refs)} user-ref relationships")
    
    # Insert user_refs in batches
    batch_size = 100
    for i in range(0, len(user_refs), batch_size):
        batch = user_refs[i:i + batch_size]
        try:
            supabase.table('user_refs').insert(batch).execute()
            print(f"✅ Synced user_refs {i+1}-{min(i+batch_size, len(user_refs))}")
        except Exception as e:
            print(f"❌ Error syncing user_refs batch {i+1}-{min(i+batch_size, len(user_refs))}: {e}")

def trigger_vector_generation(refs):
    """Trigger vector generation for refs via search API"""
    print(f"🤖 Triggering vector generation for {len(refs)} refs...")
    
    try:
        # Test if search API is running
        response = requests.get('http://localhost:8000/health')
        if response.status_code != 200:
            print("❌ Search API not running. Start it first with: python3 search_api.py")
            return
            
        # Trigger vector generation
        ref_data = [{'id': ref['id'], 'title': ref['title'], 'type': ref.get('type', '')} for ref in refs]
        response = requests.post('http://localhost:8000/generate-vectors', json={'refs': ref_data})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Vector generation triggered: {result['message']}")
        else:
            print(f"❌ Error triggering vector generation: {response.text}")
            
    except Exception as e:
        print(f"❌ Error connecting to search API: {e}")

def main():
    print("🚀 Starting PocketBase to Supabase sync...")
    
    if not POCKETBASE_DB.exists():
        print(f"❌ PocketBase database not found: {POCKETBASE_DB}")
        return
    
    try:
        # Get data from PocketBase
        print("📖 Reading data from PocketBase...")
        users, items, refs = get_pocketbase_data()
        
        print(f"📊 Found:")
        print(f"   👥 {len(users)} users")
        print(f"   📚 {len(refs)} refs")
        print(f"   📋 {len(items)} items")
        
        # Connect to Supabase
        print("🔗 Connecting to Supabase...")
        supabase = get_supabase_client()
        
        # Sync data
        sync_users_to_supabase(supabase, users)
        sync_refs_to_supabase(supabase, refs)
        sync_user_refs_to_supabase(supabase, items)
        
        # Trigger vector generation
        trigger_vector_generation(refs)
        
        print("\n✅ Sync completed successfully!")
        print("🔍 You can now test people finding with the search API")
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")

if __name__ == "__main__":
    main() 