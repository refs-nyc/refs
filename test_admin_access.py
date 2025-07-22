#!/usr/bin/env python3
"""
Test admin access to PocketBase to see the real data
"""

import requests
import json

def get_admin_token():
    """Get admin authentication token"""
    pb_url = "http://localhost:8090"
    
    try:
        response = requests.post(f"{pb_url}/api/admins/auth-with-password", json={
            "identity": "admin@test.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('token')
            print(f"✅ Admin authentication successful")
            return token
        else:
            print(f"❌ Admin auth failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting admin token: {e}")
        return None

def get_data_with_auth(token):
    """Get data with admin authentication"""
    pb_url = "http://localhost:8090"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n🔍 Fetching data with admin auth...")
    
    # Get users
    try:
        response = requests.get(f"{pb_url}/api/collections/users/records?perPage=100", headers=headers)
        if response.status_code == 200:
            users_data = response.json()
            print(f"👥 Users: {users_data.get('totalItems', 0)} total")
            
            # Show first few users
            users = users_data.get('items', [])
            for i, user in enumerate(users[:3]):
                print(f"   User {i+1}: {user.get('userName', 'no username')} ({user.get('email', 'no email')})")
                
        else:
            print(f"❌ Users request failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting users: {e}")
    
    # Get items
    try:
        response = requests.get(f"{pb_url}/api/collections/items/records?perPage=100", headers=headers)
        if response.status_code == 200:
            items_data = response.json()
            print(f"📦 Items: {items_data.get('totalItems', 0)} total")
                
        else:
            print(f"❌ Items request failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting items: {e}")
    
    # Get refs
    try:
        response = requests.get(f"{pb_url}/api/collections/refs/records?perPage=100", headers=headers)
        if response.status_code == 200:
            refs_data = response.json()
            print(f"📚 Refs: {refs_data.get('totalItems', 0)} total")
                
        else:
            print(f"❌ Refs request failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting refs: {e}")

def main():
    print("🔐 Testing PocketBase Admin Access\n")
    
    # Get admin token
    token = get_admin_token()
    if not token:
        print("Failed to get admin token")
        return
    
    # Get data with authentication
    get_data_with_auth(token)

if __name__ == "__main__":
    main() 