#!/usr/bin/env python3
import os
import httpx
from typing import Dict, List, Any

# Environment variables
SUPA_URL = os.getenv("SUPA_URL", "https://zrxgnplwnfaxtpffrqxo.supabase.co")
SUPA_KEY = os.getenv("SUPA_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGducGx3bmZheHRwZmZycXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA3MDgzOSwiZXhwIjoyMDY3NjQ2ODM5fQ.7qfmXc1hACRrVkU02J05xiaqhtO95sHMcLqf9yrNxc4")

headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json"
}

async def check_database_state():
    async with httpx.AsyncClient() as client:
        print("🔍 Checking database state...")
        
        # Check if items table exists
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/items?select=count", headers=headers)
            if response.status_code == 200:
                print("✅ items table exists")
            else:
                print("❌ items table does not exist")
                return
        except Exception as e:
            print(f"❌ Error checking items table: {e}")
            return
        
        # Check if user_refs table exists
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/user_refs?select=count", headers=headers)
            if response.status_code == 200:
                print("✅ user_refs table exists")
            else:
                print("❌ user_refs table does not exist")
        except Exception as e:
            print(f"❌ Error checking user_refs table: {e}")
        
        # Get users from users table
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/users?select=user_id", headers=headers)
            if response.status_code == 200:
                users = response.json()
                user_ids = [user['user_id'] for user in users]
                print(f"✅ Found {len(user_ids)} users in users table")
                print(f"   Sample user IDs: {user_ids[:5]}")
            else:
                print("❌ Could not fetch users")
                return
        except Exception as e:
            print(f"❌ Error fetching users: {e}")
            return
        
        # Get user_refs data
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/user_refs?select=user_id,ref_id,caption", headers=headers)
            if response.status_code == 200:
                user_refs = response.json()
                print(f"✅ Found {len(user_refs)} records in user_refs table")
                
                # Check for foreign key violations
                user_ref_user_ids = set(ref['user_id'] for ref in user_refs)
                missing_user_ids = user_ref_user_ids - set(user_ids)
                
                if missing_user_ids:
                    print(f"❌ Found {len(missing_user_ids)} user IDs in user_refs that don't exist in users table:")
                    print(f"   Missing user IDs: {list(missing_user_ids)[:10]}")
                    
                    # Show sample records with missing user IDs
                    problematic_refs = [ref for ref in user_refs if ref['user_id'] in missing_user_ids]
                    print(f"   Sample problematic records: {problematic_refs[:3]}")
                else:
                    print("✅ All user_refs have valid user_id references")
            else:
                print("❌ Could not fetch user_refs")
        except Exception as e:
            print(f"❌ Error fetching user_refs: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_database_state()) 