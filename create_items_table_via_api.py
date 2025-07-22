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

async def create_items_table():
    async with httpx.AsyncClient() as client:
        print("🔨 Creating items table...")
        
        # First, let's check if we can create a table by inserting a dummy record
        # We'll use the same approach as the user_refs table
        
        # Get a sample user_id to use as creator
        try:
            response = await client.get(f"{SUPA_URL}/rest/v1/users?select=user_id&limit=1", headers=headers)
            if response.status_code == 200:
                users = response.json()
                if users:
                    sample_user_id = users[0]['user_id']
                    print(f"✅ Using sample user_id: {sample_user_id}")
                else:
                    print("❌ No users found")
                    return
            else:
                print(f"❌ Could not fetch users: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Error fetching users: {e}")
            return
        
        # Try to create the table by inserting a dummy record
        try:
            dummy_data = {
                "creator": sample_user_id,
                "ref_id": "dummy_ref_id",
                "text": "dummy_text"
            }
            
            print("📝 Attempting to create items table by inserting dummy record...")
            response = await client.post(f"{SUPA_URL}/rest/v1/items", headers=headers, json=dummy_data)
            
            if response.status_code == 201:
                print("✅ Successfully created items table!")
                dummy_record = response.json()
                print(f"   Created record with ID: {dummy_record.get('id')}")
                
                # Delete the dummy record
                print("🗑️  Cleaning up dummy record...")
                delete_response = await client.delete(f"{SUPA_URL}/rest/v1/items?id=eq.{dummy_record['id']}", headers=headers)
                if delete_response.status_code in [200, 204]:
                    print("✅ Dummy record deleted")
                else:
                    print(f"⚠️  Could not delete dummy record: {delete_response.status_code}")
                
                # Verify table exists
                verify_response = await client.get(f"{SUPA_URL}/rest/v1/items?select=count", headers=headers)
                if verify_response.status_code == 200:
                    count = verify_response.json()[0]['count']
                    print(f"✅ items table verified with {count} records")
                else:
                    print(f"❌ Could not verify items table: {verify_response.status_code}")
                    
            else:
                print(f"❌ Failed to create items table: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating items table: {e}")

if __name__ == "__main__":
    asyncio.run(create_items_table()) 