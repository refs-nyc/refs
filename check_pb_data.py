#!/usr/bin/env python3
"""
Check what data actually exists in PocketBase
"""

import requests
import json
import sqlite3
import os

def check_via_sqlite():
    """Check PocketBase data directly via SQLite"""
    db_path = ".pocketbase/data.db"
    
    if not os.path.exists(db_path):
        print("❌ PocketBase database not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check what tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("📊 Available tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check users table
        if any('users' in str(table) for table in tables):
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            print(f"\n👥 Users table: {user_count} records")
            
            if user_count > 0:
                # First check what columns exist
                cursor.execute("PRAGMA table_info(users)")
                columns = cursor.fetchall()
                print("   Columns:")
                for col in columns:
                    print(f"     - {col[1]} ({col[2]})")
                
                # Try to get user data with available columns
                try:
                    cursor.execute("SELECT id, username, email FROM users LIMIT 5")
                    users = cursor.fetchall()
                    print("   Recent users:")
                    for user in users:
                        print(f"   - {user[1]} ({user[2]})")
                except:
                    cursor.execute("SELECT * FROM users LIMIT 1")
                    users = cursor.fetchall()
                    print(f"   Found user data: {users[0] if users else 'None'}")
        
        # Check for any table with 'ref' in the name
        ref_tables = [table[0] for table in tables if 'ref' in table[0].lower()]
        print(f"\n📚 Tables with 'ref': {ref_tables}")
        
        for table_name in ref_tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   {table_name}: {count} records")
            
            if count > 0:
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                print(f"   Columns in {table_name}: {[col[1] for col in columns]}")
        
        # Check for any table with 'item' in the name
        item_tables = [table[0] for table in tables if 'item' in table[0].lower()]
        print(f"\n🔗 Tables with 'item': {item_tables}")
        
        for table_name in item_tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   {table_name}: {count} records")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")

def check_via_api_with_auth():
    """Try to check data via API with admin authentication"""
    pb_url = "http://localhost:8090"
    
    try:
        # Try to get admin auth (this won't work without credentials, but let's see the error)
        response = requests.post(f"{pb_url}/api/admins/auth-with-password", json={
            "identity": "admin@example.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('token')
            
            # Try to get users with auth
            headers = {"Authorization": f"Bearer {token}"}
            users_response = requests.get(f"{pb_url}/api/collections/users/records", headers=headers)
            
            if users_response.status_code == 200:
                users_data = users_response.json()
                print(f"✅ Found {users_data.get('totalItems', 0)} users via authenticated API")
                
        else:
            print("ℹ️  No admin credentials configured, using direct database access")
            
    except Exception as e:
        print(f"ℹ️  API authentication not available: {e}")

def main():
    print("🔍 Checking PocketBase data...\n")
    
    # Try API first, fall back to direct database access
    check_via_api_with_auth()
    print()
    check_via_sqlite()

if __name__ == "__main__":
    main() 