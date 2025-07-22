#!/usr/bin/env python3
"""
Cleanup script to delete orphaned items that have creators not in the users table.
This removes test data and ensures data integrity.
"""

import os
import httpx
from typing import List

# Environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not all([SUPA_URL, SUPA_KEY]):
    raise ValueError("Missing required environment variables: SUPA_URL, SUPA_KEY")

headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json"
}

def get_orphaned_items() -> List[dict]:
    """Get all items that have creators not in the users table"""
    # First get all user IDs
    users_url = f"{SUPA_URL}/rest/v1/users?select=user_id"
    try:
        response = httpx.get(users_url, headers=headers)
        response.raise_for_status()
        users = response.json()
        valid_user_ids = set(user['user_id'] for user in users if user['user_id'])
        print(f"Found {len(valid_user_ids)} valid users")
    except Exception as e:
        print(f"Error getting users: {e}")
        return []
    
    # Get all items
    items_url = f"{SUPA_URL}/rest/v1/items?select=id,creator,text,ref_id"
    try:
        response = httpx.get(items_url, headers=headers)
        response.raise_for_status()
        items = response.json()
        print(f"Found {len(items)} total items")
    except Exception as e:
        print(f"Error getting items: {e}")
        return []
    
    # Find orphaned items
    orphaned_items = []
    for item in items:
        if item.get('creator') and item['creator'] not in valid_user_ids:
            orphaned_items.append(item)
    
    return orphaned_items

def delete_orphaned_items(items: List[dict]) -> int:
    """Delete orphaned items and return count of deleted items"""
    if not items:
        return 0
    
    deleted_count = 0
    
    for item in items:
        item_id = item['id']
        creator = item['creator']
        text = item.get('text', 'No text')
        ref_id = item.get('ref_id', 'No ref')
        
        text_preview = text[:50] if text else 'No text'
        print(f"Deleting item {item_id} (creator: {creator}, text: '{text_preview}...', ref: {ref_id})")
        
        delete_url = f"{SUPA_URL}/rest/v1/items?id=eq.{item_id}"
        try:
            response = httpx.delete(delete_url, headers=headers)
            response.raise_for_status()
            deleted_count += 1
            print(f"  ✅ Deleted successfully")
        except Exception as e:
            print(f"  ❌ Error deleting: {e}")
    
    return deleted_count

def main():
    print("🧹 Cleaning up orphaned items...")
    print("=" * 50)
    
    # Get orphaned items
    orphaned_items = get_orphaned_items()
    
    if not orphaned_items:
        print("✅ No orphaned items found!")
        return
    
    print(f"\n🚨 Found {len(orphaned_items)} orphaned items to delete:")
    print("-" * 50)
    
    # Show what will be deleted
    for i, item in enumerate(orphaned_items, 1):
        creator = item['creator']
        text = item.get('text') or 'No text'
        text_preview = text[:50] if text else 'No text'
        ref_id = item.get('ref_id', 'No ref')
        print(f"{i:2d}. ID: {item['id']}")
        print(f"    Creator: {creator}")
        print(f"    Text: {text_preview}...")
        print(f"    Ref ID: {ref_id}")
        print()
    
    # Ask for confirmation
    response = input("Do you want to delete these orphaned items? (yes/no): ").lower().strip()
    
    if response in ['yes', 'y']:
        print("\n🗑️  Deleting orphaned items...")
        deleted_count = delete_orphaned_items(orphaned_items)
        print(f"\n✅ Successfully deleted {deleted_count} orphaned items")
        
        if deleted_count == len(orphaned_items):
            print("🎉 All orphaned items cleaned up!")
        else:
            print(f"⚠️  {len(orphaned_items) - deleted_count} items could not be deleted")
    else:
        print("❌ Cleanup cancelled")

if __name__ == "__main__":
    main() 