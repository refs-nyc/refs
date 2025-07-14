#!/usr/bin/env python3

import requests
import json
import time
from supabase import create_client
import os

# Environment setup
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY") 
API_URL = "http://localhost:8000"

if not SUPA_URL or not SUPA_KEY:
    print("Missing required environment variables: SUPA_URL, SUPA_KEY")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPA_URL, SUPA_KEY)

def get_all_users():
    """Get all users from the database"""
    try:
        result = supabase.table('users').select('user_id, username, name').execute()
        return result.data
    except Exception as e:
        print(f"Error getting users: {e}")
        return []

def generate_personality(user_id):
    """Generate personality for a specific user via API"""
    try:
        response = requests.post(
            f"{API_URL}/generate-user-personality",
            json={"user_id": user_id, "limit_refs": 12},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("personality_summary"), data.get("refs_analyzed", 0)
        else:
            print(f"API error for user {user_id}: {response.status_code} - {response.text}")
            return None, 0
            
    except Exception as e:
        print(f"Error generating personality for user {user_id}: {e}")
        return None, 0

def main():
    print("🚀 Starting personality generation for all users...")
    
    # Check if API is running
    try:
        health_response = requests.get(f"{API_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ API is not running or unhealthy. Please start the search API first.")
            exit(1)
        print("✅ API is healthy and running")
    except Exception as e:
        print(f"❌ Cannot reach API at {API_URL}: {e}")
        print("Please make sure the search API is running on port 8000")
        exit(1)
    
    # Get all users
    users = get_all_users()
    print(f"📋 Found {len(users)} users to process")
    
    if not users:
        print("No users found!")
        return
    
    # Generate personalities
    successful = 0
    skipped = 0
    
    for i, user in enumerate(users, 1):
        user_id = user['user_id']
        username = user.get('username', 'Unknown')
        name = user.get('name', '')
        
        print(f"\n[{i}/{len(users)}] Processing user: {username} ({user_id})")
        
        personality, refs_count = generate_personality(user_id)
        
        if personality and refs_count > 0:
            print(f"  ✅ Generated personality ({refs_count} refs analyzed)")
            print(f"  💭 {personality[:100]}{'...' if len(personality) > 100 else ''}")
            successful += 1
        elif refs_count == 0:
            print(f"  ⏭️  Skipped - no refs found for this user")
            skipped += 1
        else:
            print(f"  ❌ Failed to generate personality")
        
        # Small delay to be nice to the API
        time.sleep(0.5)
    
    print(f"\n🎉 Personality generation complete!")
    print(f"✅ Successfully generated: {successful}")
    print(f"⏭️  Skipped (no refs): {skipped}")
    print(f"❌ Failed: {len(users) - successful - skipped}")
    
    if successful > 0:
        print(f"\n💡 Note: Personalities are generated but not cached since the user_personalities table doesn't exist yet.")
        print(f"   Each personality generation costs ~$0.01 per user. Total estimated cost: ~${successful * 0.01:.2f}")

if __name__ == "__main__":
    main() 