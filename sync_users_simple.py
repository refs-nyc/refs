#!/usr/bin/env python3
"""
Simple sync script using raw SQL to avoid Supabase schema cache issues
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
    
    # Get users
    cursor.execute("""
        SELECT id, userName, firstName, lastName, email, image, location, lat, lon, created, updated
        FROM users
        WHERE userName IS NOT NULL AND userName != ''
    """)
    users = cursor.fetchall()
    
    # Get items with their refs  
    cursor.execute("""
        SELECT i.id, i.creator, i.ref, i.backlog, i.created
        FROM Items i
        WHERE i.creator IS NOT NULL AND i.ref IS NOT NULL
    """)
    items = cursor.fetchall()
    
    # Get all refs
    cursor.execute("""
        SELECT id, title, image, creator, type, meta, url, created, updated
        FROM refs
    """)
    refs = cursor.fetchall()
    
    conn.close()
    return users, items, refs

def sync_with_raw_sql():
    """Sync data using direct SQL commands"""
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("📖 Reading data from PocketBase...")
        users, items, refs = get_pocketbase_data()
        
        print(f"📊 Found:")
        print(f"   👥 {len(users)} users")
        print(f"   📚 {len(refs)} refs")
        print(f"   📋 {len(items)} items")
        
        # Clear existing data
        print("🗑️  Clearing existing data...")
        supabase.postgrest.rpc('sql', {'query': 'DELETE FROM user_refs;'}).execute()
        supabase.postgrest.rpc('sql', {'query': 'DELETE FROM ref_vectors;'}).execute()
        supabase.postgrest.rpc('sql', {'query': 'DELETE FROM refs;'}).execute()
        supabase.postgrest.rpc('sql', {'query': 'DELETE FROM users;'}).execute()
        
        # Insert users
        print("👥 Inserting users...")
        for i, user in enumerate(users):
            user_id, userName, firstName, lastName, email, image, location, lat, lon, created, updated = user
            
            # Handle None values
            firstName = firstName or ''
            lastName = lastName or ''
            email = email or ''
            image = image or ''
            location = location or ''
            lat = lat if lat is not None else 0
            lon = lon if lon is not None else 0
            created = created or ''
            updated = updated or ''
            
            sql = f"""
            INSERT INTO users (id, userName, firstName, lastName, email, image, location, lat, lon, created, updated)
            VALUES ('{user_id}', '{userName}', '{firstName}', '{lastName}', '{email}', '{image}', '{location}', {lat}, {lon}, '{created}', '{updated}');
            """
            
            try:
                supabase.postgrest.rpc('sql', {'query': sql}).execute()
                if i % 10 == 0:
                    print(f"   ✅ Inserted {i+1}/{len(users)} users")
            except Exception as e:
                print(f"   ❌ Error inserting user {userName}: {e}")
        
        # Insert refs  
        print("📚 Inserting refs...")
        for i, ref in enumerate(refs):
            ref_id, title, image, creator, ref_type, meta, url, created, updated = ref
            
            # Handle None values and escape quotes
            title = (title or '').replace("'", "''")
            image = image or ''
            creator = creator or ''
            ref_type = ref_type or ''
            meta = meta or ''
            url = url or ''
            created = created or ''
            updated = updated or ''
            
            sql = f"""
            INSERT INTO refs (id, title, image, creator, type, meta, url, created, updated)
            VALUES ('{ref_id}', '{title}', '{image}', '{creator}', '{ref_type}', '{meta}', '{url}', '{created}', '{updated}');
            """
            
            try:
                supabase.postgrest.rpc('sql', {'query': sql}).execute()
                if i % 50 == 0:
                    print(f"   ✅ Inserted {i+1}/{len(refs)} refs")
            except Exception as e:
                print(f"   ❌ Error inserting ref {ref_id}: {e}")
        
        # Insert user_refs
        print("🔗 Inserting user-ref relationships...")
        for i, item in enumerate(items):
            item_id, user_id, ref_id, backlog, created = item
            
            backlog = 'true' if backlog else 'false'
            created = created or ''
            
            sql = f"""
            INSERT INTO user_refs (user_id, ref_id, item_id, backlog, created)
            VALUES ('{user_id}', '{ref_id}', '{item_id}', {backlog}, '{created}');
            """
            
            try:
                supabase.postgrest.rpc('sql', {'query': sql}).execute()
                if i % 50 == 0:
                    print(f"   ✅ Inserted {i+1}/{len(items)} user-refs")
            except Exception as e:
                print(f"   ❌ Error inserting user-ref {item_id}: {e}")
        
        print("\n✅ Data sync completed!")
        print("🔍 Now starting vector generation...")
        
        # Trigger vector generation
        try:
            response = requests.get('http://localhost:8000/health')
            if response.status_code == 200:
                ref_data = [{'id': ref[0], 'title': ref[1], 'type': ref[4] or ''} for ref in refs]
                response = requests.post('http://localhost:8000/generate-vectors', json={'refs': ref_data})
                if response.status_code == 200:
                    print("🤖 Vector generation triggered successfully!")
                else:
                    print(f"❌ Vector generation failed: {response.text}")
            else:
                print("❌ Search API not running")
        except Exception as e:
            print(f"❌ Error triggering vectors: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")
        return False

if __name__ == "__main__":
    sync_with_raw_sql() 