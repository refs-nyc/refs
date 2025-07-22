#!/usr/bin/env python3
import os
import httpx
import asyncio
from typing import Dict, List, Any

# Environment variables
SUPA_URL = os.getenv("SUPA_URL", "https://zrxgnplwnfaxtpffrqxo.supabase.co")
SUPA_KEY = os.getenv("SUPA_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGducGx3bmZheHRwZmZycXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA3MDgzOSwiZXhwIjoyMDY3NjQ2ODM5fQ.7qfmXc1hACRrVkU02J05xiaqhtO95sHMcLqf9yrNxc4")

headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json"
}

async def step_by_step_migration():
    async with httpx.AsyncClient() as client:
        print("🚀 Starting step-by-step migration...")
        
        # Step 1: Check current state
        print("\n📊 Step 1: Checking current database state...")
        
        # Get users
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/users?select=user_id", headers=headers)
            if response.status_code == 200:
                users = response.json()
                user_ids = set(user['user_id'] for user in users)
                print(f"✅ Found {len(user_ids)} users in users table")
            else:
                print(f"❌ Could not fetch users: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Error fetching users: {e}")
            return
        
        # Get user_refs
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/user_refs?select=user_id,ref_id,caption,created_at,updated_at", headers=headers)
            if response.status_code == 200:
                user_refs = response.json()
                print(f"✅ Found {len(user_refs)} records in user_refs table")
                
                # Check for foreign key violations
                user_ref_user_ids = set(ref['user_id'] for ref in user_refs)
                missing_user_ids = user_ref_user_ids - user_ids
                
                if missing_user_ids:
                    print(f"⚠️  Found {len(missing_user_ids)} user IDs that don't exist in users table")
                    print(f"   Missing user IDs: {list(missing_user_ids)[:5]}")
                    
                    # Filter out records with missing user IDs
                    valid_user_refs = [ref for ref in user_refs if ref['user_id'] in user_ids]
                    print(f"✅ Will migrate {len(valid_user_refs)} valid records")
                else:
                    valid_user_refs = user_refs
                    print("✅ All user_refs have valid user_id references")
            else:
                print(f"❌ Could not fetch user_refs: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Error fetching user_refs: {e}")
            return
        
        # Step 2: Create items table
        print("\n🔨 Step 2: Creating items table...")
        
        # First, try to drop the table if it exists
        try:
            response = await client.delete(f"{SUPA_URL}/rest/v1/items", headers=headers)
            if response.status_code in [200, 204, 404]:
                print("✅ Cleaned up existing items table")
        except Exception as e:
            print(f"⚠️  Could not clean up items table: {e}")
        
        # Create the table structure by inserting a dummy record and then deleting it
        try:
            # Insert a dummy record to create the table structure
            dummy_data = {
                "creator": list(user_ids)[0] if user_ids else "dummy_user",
                "ref_id": "dummy_ref",
                "text": "dummy_text"
            }
            
            response = await client.post(f"{SUPA_URL}/rest/v1/items", headers=headers, json=dummy_data)
            if response.status_code == 201:
                print("✅ Created items table structure")
                
                # Delete the dummy record
                dummy_id = response.json()['id']
                await client.delete(f"{SUPA_URL}/rest/v1/items?id=eq.{dummy_id}", headers=headers)
                print("✅ Removed dummy record")
            else:
                print(f"❌ Could not create items table: {response.status_code}")
                print(f"   Error: {response.text}")
                return
        except Exception as e:
            print(f"❌ Error creating items table: {e}")
            return
        
        # Step 3: Migrate data
        print(f"\n📦 Step 3: Migrating {len(valid_user_refs)} records...")
        
        migrated_count = 0
        for i, ref in enumerate(valid_user_refs, 1):
            try:
                item_data = {
                    "creator": ref['user_id'],
                    "ref_id": ref['ref_id'],
                    "text": ref.get('caption', ''),
                    "created_at": ref.get('created_at'),
                    "updated_at": ref.get('updated_at')
                }
                
                response = await client.post(f"{SUPA_URL}/rest/v1/items", headers=headers, json=item_data)
                if response.status_code == 201:
                    migrated_count += 1
                    if i % 10 == 0:
                        print(f"   ✅ Migrated {i}/{len(valid_user_refs)} records")
                else:
                    print(f"   ❌ Failed to migrate record {i}: {response.status_code}")
                    print(f"      Error: {response.text}")
                    
            except Exception as e:
                print(f"   ❌ Error migrating record {i}: {e}")
        
        print(f"✅ Successfully migrated {migrated_count}/{len(valid_user_refs)} records")
        
        # Step 4: Verify migration
        print("\n🔍 Step 4: Verifying migration...")
        
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/items?select=count", headers=headers)
            if response.status_code == 200:
                items_count = response.json()[0]['count']
                print(f"✅ items table now contains {items_count} records")
                
                # Show sample data
                response = await client.get(f"{SUPA_URL}/rest/v1/items?select=creator,ref_id,text&limit=5", headers=headers)
                if response.status_code == 200:
                    sample_items = response.json()
                    print("📋 Sample items:")
                    for item in sample_items:
                        print(f"   - {item['creator']}: {item['ref_id']} -> {item['text'][:50]}...")
            else:
                print(f"❌ Could not verify migration: {response.status_code}")
        except Exception as e:
            print(f"❌ Error verifying migration: {e}")
        
        print("\n🎉 Migration completed!")

if __name__ == "__main__":
    asyncio.run(step_by_step_migration()) 