#!/usr/bin/env python3
"""
Check what tables exist in Supabase and their column structure
"""

import os
import httpx

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

def check_table(table_name):
    """Check if a table exists and get its structure"""
    print(f"\n=== Checking table: {table_name} ===")
    
    # Try to get one row to see if table exists
    url = f"{SUPA_URL}/rest/v1/{table_name}?limit=1"
    try:
        response = httpx.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Table {table_name} exists")
            if data:
                print(f"Sample columns: {list(data[0].keys())}")
            else:
                print("Table is empty")
        else:
            print(f"❌ Table {table_name} does not exist or is not accessible")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error checking table {table_name}: {e}")

def main():
    print("🔍 Checking Supabase Tables")
    print("=" * 50)
    
    tables_to_check = [
        "users",
        "refs", 
        "items",
        "user_refs",
        "ref_vectors",
        "user_personalities",
        "user_ref_personalities",
        "search_history"
    ]
    
    for table in tables_to_check:
        check_table(table)
    
    print("\n✅ Table check complete!")

if __name__ == "__main__":
    main() 