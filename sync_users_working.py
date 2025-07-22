#!/usr/bin/env python3
"""
Sync PocketBase users to Supabase using the correct column names
"""

import sqlite3
import os
from supabase import create_client, Client

def sync_users_with_correct_columns():
    """Sync users using the column names that actually exist"""
    
    # Connect to PocketBase
    pb_db_path = '.pocketbase/pb_data/data.db'
    if not os.path.exists(pb_db_path):
        print(f"❌ PocketBase database not found at {pb_db_path}")
        return False
    
    # Connect to Supabase
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase environment variables")
        return False
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        conn = sqlite3.connect(pb_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get users from PocketBase
        cursor.execute("SELECT * FROM users LIMIT 5")
        users = cursor.fetchall()
        
        print(f"📥 Found {len(users)} users in PocketBase")
        
        for user in users:
            try:
                # Map PocketBase columns to Supabase columns that exist
                user_data = {
                    'user_id': user['id'],  # PocketBase 'id' -> Supabase 'user_id'
                    'username': user['userName'] if user['userName'] else '',  # This column exists
                }
                
                print(f"📤 Syncing user: {user_data['user_id']} ({user_data['username']})")
                
                # Insert to Supabase (upsert)
                result = supabase.table('users').upsert(user_data).execute()
                print(f"✅ Synced: {len(result.data)} records")
                
            except Exception as e:
                print(f"❌ Error syncing user {user['id']}: {e}")
        
        conn.close()
        print("🎉 User sync completed!")
        
        # Verify sync
        result = supabase.table('users').select('user_id, username').execute()
        print(f"✅ Verification: {len(result.data)} users in Supabase")
        for user in result.data:
            print(f"   - {user['user_id']}: {user['username']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    sync_users_with_correct_columns() 