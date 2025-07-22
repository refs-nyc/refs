#!/usr/bin/env python3

import requests
import os

# Get environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not SUPA_URL or not SUPA_KEY:
    print("Missing required environment variables: SUPA_URL, SUPA_KEY")
    exit(1)

# SQL to create the table
sql = """
CREATE TABLE IF NOT EXISTS user_personalities (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    personality_summary TEXT NOT NULL,
    ref_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""

print("🔨 Creating user_personalities table...")

# Try different approaches to execute SQL

# Approach 1: Direct SQL via REST (if available)
try:
    response = requests.post(
        f"{SUPA_URL}/rest/v1/rpc/exec",
        headers={
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}",
            "Content-Type": "application/json"
        },
        json={"sql": sql.strip()}
    )
    
    if response.status_code == 200:
        print("✅ Table created successfully via exec RPC!")
        exit(0)
    else:
        print(f"❌ exec RPC failed: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ exec RPC error: {e}")

# Approach 2: Check if table already exists by querying it
try:
    response = requests.get(
        f"{SUPA_URL}/rest/v1/user_personalities?limit=1",
        headers={
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}"
        }
    )
    
    if response.status_code == 200:
        print("✅ user_personalities table already exists!")
        exit(0)
    else:
        print(f"❌ Table doesn't exist: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Table check error: {e}")

print("\n📝 Please create the table manually in your Supabase SQL editor:")
print("Go to: https://supabase.com/dashboard/project/[your-project]/sql")
print("\nRun this SQL:")
print("=" * 50)
print(sql)
print("=" * 50) 