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

async def simple_migration():
    async with httpx.AsyncClient() as client:
        print("🚀 Starting simple migration...")
        
        # Step 1: Get user_refs data
        print("\n📊 Step 1: Getting user_refs data...")
        
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/user_refs?select=user_id,ref_id,caption,created_at", headers=headers)
            if response.status_code == 200:
                user_refs = response.json()
                print(f"✅ Found {len(user_refs)} records in user_refs table")
            else:
                print(f"❌ Could not fetch user_refs: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Error fetching user_refs: {e}")
            return
        
        # Step 2: Create items table by inserting data
        print(f"\n📦 Step 2: Creating items table and migrating {len(user_refs)} records...")
        
        migrated_count = 0
        for i, ref in enumerate(user_refs, 1):
            try:
                item_data = {
                    "creator": ref['user_id'],
                    "ref_id": ref['ref_id'],
                    "text": ref.get('caption', ''),
                    "created_at": ref.get('created_at')
                }
                
                response = await client.post(f"{SUPA_URL}/rest/v1/items", headers=headers, json=item_data)
                if response.status_code == 201:
                    migrated_count += 1
                    if i % 5 == 0:
                        print(f"   ✅ Migrated {i}/{len(user_refs)} records")
                else:
                    print(f"   ❌ Failed to migrate record {i}: {response.status_code}")
                    print(f"      Error: {response.text}")
                    
            except Exception as e:
                print(f"   ❌ Error migrating record {i}: {e}")
        
        print(f"✅ Successfully migrated {migrated_count}/{len(user_refs)} records")
        
        # Step 3: Verify migration
        print("\n🔍 Step 3: Verifying migration...")
        
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
    asyncio.run(simple_migration()) 