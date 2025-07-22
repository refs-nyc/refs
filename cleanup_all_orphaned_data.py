#!/usr/bin/env python3
"""
Comprehensive cleanup script to remove all orphaned data from all tables.
This ensures data integrity before adding foreign key constraints.
"""

import os
import httpx
from typing import List, Dict, Any

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

def get_all_user_ids() -> List[str]:
    """Get all user IDs from users table"""
    url = f"{SUPA_URL}/rest/v1/users?select=user_id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        users = response.json()
        return [user['user_id'] for user in users]
    except Exception as e:
        print(f"Error getting users: {e}")
        return []

def get_all_ref_ids() -> List[str]:
    """Get all ref IDs from refs table"""
    url = f"{SUPA_URL}/rest/v1/refs?select=id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        refs = response.json()
        return [ref['id'] for ref in refs]
    except Exception as e:
        print(f"Error getting refs: {e}")
        return []

def cleanup_orphaned_items(user_ids: List[str], ref_ids: List[str]):
    """Clean up orphaned items"""
    print("\n=== Cleaning up orphaned items ===")
    
    # Get all items
    url = f"{SUPA_URL}/rest/v1/items?select=id,creator,ref_id,text"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        items = response.json()
    except Exception as e:
        print(f"Error getting items: {e}")
        return
    
    orphaned_items = []
    for item in items:
        creator = item.get('creator')
        ref_id = item.get('ref_id')
        
        if creator not in user_ids or ref_id not in ref_ids:
            orphaned_items.append(item)
    
    print(f"Found {len(orphaned_items)} orphaned items")
    
    if orphaned_items:
        print("Orphaned items to delete:")
        for i, item in enumerate(orphaned_items, 1):
            creator = item.get('creator', 'Unknown')
            ref_id = item.get('ref_id', 'Unknown')
            text = item.get('text', 'No text')[:50] if item.get('text') else 'No text'
            print(f"{i:2d}. ID: {item['id']}, Creator: {creator}, Ref: {ref_id}, Text: {text}")
        
        confirm = input("\nDelete these orphaned items? (yes/no): ")
        if confirm.lower() == 'yes':
            for item in orphaned_items:
                try:
                    delete_url = f"{SUPA_URL}/rest/v1/items?id=eq.{item['id']}"
                    response = httpx.delete(delete_url, headers=headers)
                    response.raise_for_status()
                    print(f"Deleted item {item['id']}")
                except Exception as e:
                    print(f"Error deleting item {item['id']}: {e}")
        else:
            print("Skipping orphaned items deletion")

def cleanup_orphaned_user_refs(user_ids: List[str], ref_ids: List[str]):
    """Clean up orphaned user_refs"""
    print("\n=== Cleaning up orphaned user_refs ===")
    
    # Get all user_refs
    url = f"{SUPA_URL}/rest/v1/user_refs?select=id,user_id,ref_id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        user_refs = response.json()
    except Exception as e:
        print(f"Error getting user_refs: {e}")
        return
    
    orphaned_user_refs = []
    for user_ref in user_refs:
        user_id = user_ref.get('user_id')
        ref_id = user_ref.get('ref_id')
        
        if user_id not in user_ids or ref_id not in ref_ids:
            orphaned_user_refs.append(user_ref)
    
    print(f"Found {len(orphaned_user_refs)} orphaned user_refs")
    
    if orphaned_user_refs:
        print("Orphaned user_refs to delete:")
        for i, user_ref in enumerate(orphaned_user_refs, 1):
            user_id = user_ref.get('user_id', 'Unknown')
            ref_id = user_ref.get('ref_id', 'Unknown')
            print(f"{i:2d}. ID: {user_ref['id']}, User: {user_id}, Ref: {ref_id}")
        
        confirm = input("\nDelete these orphaned user_refs? (yes/no): ")
        if confirm.lower() == 'yes':
            for user_ref in orphaned_user_refs:
                try:
                    delete_url = f"{SUPA_URL}/rest/v1/user_refs?id=eq.{user_ref['id']}"
                    response = httpx.delete(delete_url, headers=headers)
                    response.raise_for_status()
                    print(f"Deleted user_ref {user_ref['id']}")
                except Exception as e:
                    print(f"Error deleting user_ref {user_ref['id']}: {e}")
        else:
            print("Skipping orphaned user_refs deletion")

def cleanup_orphaned_ref_vectors(ref_ids: List[str]):
    """Clean up orphaned ref_vectors"""
    print("\n=== Cleaning up orphaned ref_vectors ===")
    
    # Get all ref_vectors
    url = f"{SUPA_URL}/rest/v1/ref_vectors?select=id,ref_id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        ref_vectors = response.json()
    except Exception as e:
        print(f"Error getting ref_vectors: {e}")
        return
    
    orphaned_ref_vectors = []
    for ref_vector in ref_vectors:
        ref_id = ref_vector.get('ref_id')
        
        if ref_id not in ref_ids:
            orphaned_ref_vectors.append(ref_vector)
    
    print(f"Found {len(orphaned_ref_vectors)} orphaned ref_vectors")
    
    if orphaned_ref_vectors:
        print("Orphaned ref_vectors to delete:")
        for i, ref_vector in enumerate(orphaned_ref_vectors, 1):
            ref_id = ref_vector.get('ref_id', 'Unknown')
            print(f"{i:2d}. ID: {ref_vector['id']}, Ref: {ref_id}")
        
        confirm = input("\nDelete these orphaned ref_vectors? (yes/no): ")
        if confirm.lower() == 'yes':
            for ref_vector in orphaned_ref_vectors:
                try:
                    delete_url = f"{SUPA_URL}/rest/v1/ref_vectors?id=eq.{ref_vector['id']}"
                    response = httpx.delete(delete_url, headers=headers)
                    response.raise_for_status()
                    print(f"Deleted ref_vector {ref_vector['id']}")
                except Exception as e:
                    print(f"Error deleting ref_vector {ref_vector['id']}: {e}")
        else:
            print("Skipping orphaned ref_vectors deletion")

def cleanup_orphaned_user_personalities(user_ids: List[str]):
    """Clean up orphaned user_personalities"""
    print("\n=== Cleaning up orphaned user_personalities ===")
    
    # Get all user_personalities
    url = f"{SUPA_URL}/rest/v1/user_personalities?select=id,user_id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        user_personalities = response.json()
    except Exception as e:
        print(f"Error getting user_personalities: {e}")
        return
    
    orphaned_user_personalities = []
    for user_personality in user_personalities:
        user_id = user_personality.get('user_id')
        
        if user_id not in user_ids:
            orphaned_user_personalities.append(user_personality)
    
    print(f"Found {len(orphaned_user_personalities)} orphaned user_personalities")
    
    if orphaned_user_personalities:
        print("Orphaned user_personalities to delete:")
        for i, user_personality in enumerate(orphaned_user_personalities, 1):
            user_id = user_personality.get('user_id', 'Unknown')
            print(f"{i:2d}. ID: {user_personality['id']}, User: {user_id}")
        
        confirm = input("\nDelete these orphaned user_personalities? (yes/no): ")
        if confirm.lower() == 'yes':
            for user_personality in orphaned_user_personalities:
                try:
                    delete_url = f"{SUPA_URL}/rest/v1/user_personalities?id=eq.{user_personality['id']}"
                    response = httpx.delete(delete_url, headers=headers)
                    response.raise_for_status()
                    print(f"Deleted user_personality {user_personality['id']}")
                except Exception as e:
                    print(f"Error deleting user_personality {user_personality['id']}: {e}")
        else:
            print("Skipping orphaned user_personalities deletion")

def cleanup_orphaned_user_ref_personalities(user_ids: List[str], ref_ids: List[str]):
    """Clean up orphaned user_ref_personalities"""
    print("\n=== Cleaning up orphaned user_ref_personalities ===")
    
    # Get all user_ref_personalities
    url = f"{SUPA_URL}/rest/v1/user_ref_personalities?select=id,user_id,ref_id"
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        user_ref_personalities = response.json()
    except Exception as e:
        print(f"Error getting user_ref_personalities: {e}")
        return
    
    orphaned_user_ref_personalities = []
    for user_ref_personality in user_ref_personalities:
        user_id = user_ref_personality.get('user_id')
        ref_id = user_ref_personality.get('ref_id')
        
        if user_id not in user_ids or ref_id not in ref_ids:
            orphaned_user_ref_personalities.append(user_ref_personality)
    
    print(f"Found {len(orphaned_user_ref_personalities)} orphaned user_ref_personalities")
    
    if orphaned_user_ref_personalities:
        print("Orphaned user_ref_personalities to delete:")
        for i, user_ref_personality in enumerate(orphaned_user_ref_personalities, 1):
            user_id = user_ref_personality.get('user_id', 'Unknown')
            ref_id = user_ref_personality.get('ref_id', 'Unknown')
            print(f"{i:2d}. ID: {user_ref_personality['id']}, User: {user_id}, Ref: {ref_id}")
        
        confirm = input("\nDelete these orphaned user_ref_personalities? (yes/no): ")
        if confirm.lower() == 'yes':
            for user_ref_personality in orphaned_user_ref_personalities:
                try:
                    delete_url = f"{SUPA_URL}/rest/v1/user_ref_personalities?id=eq.{user_ref_personality['id']}"
                    response = httpx.delete(delete_url, headers=headers)
                    response.raise_for_status()
                    print(f"Deleted user_ref_personality {user_ref_personality['id']}")
                except Exception as e:
                    print(f"Error deleting user_ref_personality {user_ref_personality['id']}: {e}")
        else:
            print("Skipping orphaned user_ref_personalities deletion")

def main():
    print("🧹 Comprehensive Orphaned Data Cleanup")
    print("=" * 50)
    
    # Get all valid IDs
    print("Getting valid user and ref IDs...")
    user_ids = get_all_user_ids()
    ref_ids = get_all_ref_ids()
    
    print(f"Found {len(user_ids)} valid users")
    print(f"Found {len(ref_ids)} valid refs")
    
    # Clean up all orphaned data
    cleanup_orphaned_items(user_ids, ref_ids)
    cleanup_orphaned_user_refs(user_ids, ref_ids)
    cleanup_orphaned_ref_vectors(ref_ids)
    cleanup_orphaned_user_personalities(user_ids)
    cleanup_orphaned_user_ref_personalities(user_ids, ref_ids)
    
    print("\n✅ Cleanup complete!")
    print("You can now safely add foreign key constraints.")

if __name__ == "__main__":
    main() 