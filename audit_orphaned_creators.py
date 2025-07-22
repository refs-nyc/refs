#!/usr/bin/env python3
"""
Audit script to find orphaned creators in items table that don't exist in users table.
Shows plain text names of orphaned creators.
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

def get_all_creators_from_items() -> List[str]:
    """Get all unique creator values from items table"""
    url = f"{SUPA_URL}/rest/v1/items?select=creator"
    
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        items = response.json()
        
        # Extract unique creator values
        creators = list(set(item['creator'] for item in items if item['creator']))
        print(f"Found {len(creators)} unique creators in items table")
        return creators
        
    except Exception as e:
        print(f"Error getting creators from items: {e}")
        return []

def get_all_user_ids() -> List[str]:
    """Get all user_id values from users table"""
    url = f"{SUPA_URL}/rest/v1/users?select=user_id"
    
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        users = response.json()
        
        user_ids = [user['user_id'] for user in users if user['user_id']]
        print(f"Found {len(user_ids)} users in users table")
        return user_ids
        
    except Exception as e:
        print(f"Error getting users: {e}")
        return []

def get_user_details(user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Get user details for given user IDs"""
    if not user_ids:
        return {}
    
    # Query in batches to avoid URL length limits
    batch_size = 50
    all_users = {}
    
    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i:i + batch_size]
        user_id_list = ",".join([f"eq.{uid}" for uid in batch])
        url = f"{SUPA_URL}/rest/v1/users?select=user_id,name,email&user_id=or({user_id_list})"
        
        try:
            response = httpx.get(url, headers=headers)
            response.raise_for_status()
            users = response.json()
            
            for user in users:
                all_users[user['user_id']] = {
                    'name': user.get('name', 'Unknown'),
                    'email': user.get('email', 'No email')
                }
                
        except Exception as e:
            print(f"Error getting user details for batch {i//batch_size + 1}: {e}")
    
    return all_users

def main():
    print("🔍 Auditing orphaned creators in items table...")
    print("=" * 60)
    
    # Get all creators from items table
    creators = get_all_creators_from_items()
    
    # Get all user IDs from users table
    user_ids = get_all_user_ids()
    
    # Find orphaned creators
    orphaned_creators = [creator for creator in creators if creator not in user_ids]
    
    print(f"\n📊 Results:")
    print(f"Total creators in items: {len(creators)}")
    print(f"Total users in users table: {len(user_ids)}")
    print(f"Orphaned creators: {len(orphaned_creators)}")
    
    if orphaned_creators:
        print(f"\n🚨 ORPHANED CREATORS (not in users table):")
        print("-" * 60)
        
        # Get details for orphaned creators
        orphaned_details = get_user_details(orphaned_creators)
        
        for i, creator_id in enumerate(orphaned_creators, 1):
            details = orphaned_details.get(creator_id, {})
            name = details.get('name', 'Unknown')
            email = details.get('email', 'No email')
            
            print(f"{i:2d}. ID: {creator_id}")
            print(f"    Name: {name}")
            print(f"    Email: {email}")
            print()
        
        print(f"\n💡 RECOMMENDATIONS:")
        print("1. These creators exist in items table but not in users table")
        print("2. This could be due to:")
        print("   - Test data from development scripts")
        print("   - Incomplete user sync from PocketBase")
        print("   - Deleted users with remaining items")
        print("3. Options to fix:")
        print("   - Delete orphaned items (if test data)")
        print("   - Re-sync users from PocketBase")
        print("   - Add missing users to users table")
        
    else:
        print("\n✅ No orphaned creators found! All items have valid user references.")
    
    # Also check for items with null creators
    print(f"\n🔍 Checking for items with null creators...")
    url = f"{SUPA_URL}/rest/v1/items?select=id,creator&creator=is.null"
    
    try:
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        null_creator_items = response.json()
        
        if null_creator_items:
            print(f"⚠️  Found {len(null_creator_items)} items with null creators:")
            for item in null_creator_items[:10]:  # Show first 10
                print(f"   - Item ID: {item['id']}")
            if len(null_creator_items) > 10:
                print(f"   ... and {len(null_creator_items) - 10} more")
        else:
            print("✅ No items with null creators found")
            
    except Exception as e:
        print(f"Error checking null creators: {e}")

if __name__ == "__main__":
    main() 