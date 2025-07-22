#!/usr/bin/env python3
"""
Sync PocketBase Items to Supabase items table - Production Safe Version
Maps: Items.ref -> items.ref_id, Items.creator -> items.creator
Uses incremental sync with error recovery
"""

import sqlite3
import httpx
import os
import hashlib
import json
from typing import List, Dict, Any
from datetime import datetime

# Supabase configuration
SUPA_URL = os.getenv('SUPA_URL')
SUPA_KEY = os.getenv('SUPA_KEY')

if not SUPA_URL or not SUPA_KEY:
    raise ValueError("Missing required environment variables: SUPA_URL, SUPA_KEY")

def get_item_hash(item: Dict[str, Any]) -> str:
    """Generate a hash for an item to detect changes"""
    content = f"{item['creator']}:{item['ref_id']}:{item['text']}"
    return hashlib.md5(content.encode()).hexdigest()

def get_pocketbase_items() -> List[Dict[str, Any]]:
    """Get all grid items from PocketBase with hashes"""
    conn = sqlite3.connect('.pocketbase/pb_data/data.db')
    cursor = conn.cursor()
    
    # Get grid items (backlog = 0) with ref titles
    query = """
    SELECT 
        i.creator,
        i.ref as ref_id,
        i.text,
        r.title as ref_title,
        i.created,
        i.updated
    FROM Items i
    JOIN refs r ON i.ref = r.id
    WHERE i.backlog = 0
    ORDER BY i.created DESC
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    items = []
    for row in rows:
        item = {
            'creator': row[0],
            'ref_id': row[1],
            'text': row[2] or '',  # Use empty string if None
            'ref_title': row[3],
            'created': row[4],
            'updated': row[5]
        }
        item['hash'] = get_item_hash(item)
        items.append(item)
    
    conn.close()
    return items

def get_supabase_items() -> Dict[str, Dict[str, Any]]:
    """Get existing items from Supabase with their hashes"""
    headers = {
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}'
    }
    
    try:
        response = httpx.get(f"{SUPA_URL}/rest/v1/items?select=*", headers=headers)
        if response.status_code == 200:
            items = response.json()
            return {f"{item['creator']}:{item['ref_id']}": item for item in items}
        else:
            print(f"⚠️  Could not fetch existing items: {response.status_code}")
            return {}
    except Exception as e:
        print(f"⚠️  Error fetching existing items: {e}")
        return {}

def safe_sync_items_to_supabase(pb_items: List[Dict[str, Any]]) -> None:
    """Safely sync items to Supabase with incremental updates"""
    headers = {
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    # Get existing items from Supabase
    print("📥 Fetching existing items from Supabase...")
    existing_items = get_supabase_items()
    
    # Identify changes
    items_to_insert = []
    items_to_update = []
    unchanged_count = 0
    
    for pb_item in pb_items:
        key = f"{pb_item['creator']}:{pb_item['ref_id']}"
        existing_item = existing_items.get(key)
        
        if not existing_item:
            # New item
            items_to_insert.append({
                'creator': pb_item['creator'],
                'ref_id': pb_item['ref_id'],
                'text': pb_item['text'],
                'pocketbase_hash': pb_item['hash']
            })
        elif existing_item.get('pocketbase_hash') != pb_item['hash']:
            # Updated item
            items_to_update.append({
                'id': existing_item['id'],
                'creator': pb_item['creator'],
                'ref_id': pb_item['ref_id'],
                'text': pb_item['text'],
                'pocketbase_hash': pb_item['hash']
            })
        else:
            # Unchanged
            unchanged_count += 1
    
    print(f"📊 Sync Analysis:")
    print(f"   New items: {len(items_to_insert)}")
    print(f"   Updated items: {len(items_to_update)}")
    print(f"   Unchanged items: {unchanged_count}")
    
    # Insert new items
    if items_to_insert:
        print(f"📤 Inserting {len(items_to_insert)} new items...")
        batch_size = 50
        for i in range(0, len(items_to_insert), batch_size):
            batch = items_to_insert[i:i + batch_size]
            try:
        response = httpx.post(
            f"{SUPA_URL}/rest/v1/items",
            headers=headers,
                    json=batch
        )
        if response.status_code == 201:
                    print(f"✅ Inserted batch {i//batch_size + 1}/{(len(items_to_insert) + batch_size - 1)//batch_size}")
        else:
                    print(f"❌ Failed to insert batch {i//batch_size + 1}: {response.status_code}")
            print(f"Error: {response.text}")
            except Exception as e:
                print(f"❌ Error inserting batch {i//batch_size + 1}: {e}")
    
    # Update existing items
    if items_to_update:
        print(f"🔄 Updating {len(items_to_update)} items...")
        batch_size = 50
        for i in range(0, len(items_to_update), batch_size):
            batch = items_to_update[i:i + batch_size]
            try:
                response = httpx.patch(
                    f"{SUPA_URL}/rest/v1/items",
                    headers=headers,
                    json=batch
                )
                if response.status_code == 200:
                    print(f"✅ Updated batch {i//batch_size + 1}/{(len(items_to_update) + batch_size - 1)//batch_size}")
                else:
                    print(f"❌ Failed to update batch {i//batch_size + 1}: {response.status_code}")
                    print(f"Error: {response.text}")
            except Exception as e:
                print(f"❌ Error updating batch {i//batch_size + 1}: {e}")

def verify_sync() -> None:
    """Verify the sync worked"""
    headers = {
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}'
    }
    
    try:
    # Check count
    response = httpx.get(f"{SUPA_URL}/rest/v1/items?select=count", headers=headers)
    if response.status_code == 200:
        count = response.json()[0]['count']
        print(f"📊 Supabase now has {count} items")
    
    # Check a few sample items
    response = httpx.get(f"{SUPA_URL}/rest/v1/items?select=creator,text,ref_id&limit=3", headers=headers)
    if response.status_code == 200:
        sample_items = response.json()
        print("📋 Sample items in Supabase:")
        for item in sample_items:
            print(f"  - Creator: {item['creator']}, Ref: {item['ref_id']}, Text: '{item['text']}'")
    except Exception as e:
        print(f"⚠️  Error during verification: {e}")

def main():
    print("🔄 Starting safe PocketBase to Supabase sync...")
    start_time = datetime.now()
    
    try:
    # Get items from PocketBase
    print("📥 Fetching items from PocketBase...")
    items = get_pocketbase_items()
    print(f"📦 Found {len(items)} grid items in PocketBase")
    
    if not items:
        print("❌ No items found in PocketBase!")
        return
    
    # Show sample items
    print("📋 Sample items from PocketBase:")
    for item in items[:3]:
        print(f"  - Creator: {item['creator']}, Ref: {item['ref_title']} ({item['ref_id']}), Text: '{item['text']}'")
    
        # Safe sync to Supabase
        safe_sync_items_to_supabase(items)
    
    # Verify
    print("\n🔍 Verifying sync...")
    verify_sync()
    
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"✅ Sync completed successfully in {duration:.2f} seconds!")
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")
        print("💡 Your existing data is safe - no data was deleted")
        raise

if __name__ == "__main__":
    main() 