#!/usr/bin/env python3
"""
Test script to add a user directly to PocketBase for testing
"""

import requests
import json

def create_test_user():
    """Create a test user in PocketBase"""
    pb_url = "http://localhost:8090"
    
    # Test user data matching your zeus@gmail.com example
    user_data = {
        "userName": "testuser",
        "email": "testuser@example.com",
        "firstName": "Zeus",
        "lastName": "God",
        "password": "testpassword123",
        "passwordConfirm": "testpassword123"
    }
    
    try:
        # Create user
        response = requests.post(
            f"{pb_url}/api/collections/users/records",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ Created user: {user['userName']} ({user['email']})")
            return user['id']
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def create_test_refs(user_id):
    """Create test refs for the user"""
    pb_url = "http://localhost:8090"
    
    refs_data = [
        {"title": "The Parthenon", "type": "place", "creator": user_id},
        {"title": "Lightning Bolt Collection", "type": "artwork", "creator": user_id},
        {"title": "Mount Olympus Guide", "type": "other", "creator": user_id}
    ]
    
    ref_ids = []
    for ref_data in refs_data:
        try:
            response = requests.post(
                f"{pb_url}/api/collections/refs/records",
                json=ref_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                ref = response.json()
                ref_ids.append(ref['id'])
                print(f"✅ Created ref: {ref['title']}")
            else:
                print(f"❌ Failed to create ref: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating ref: {e}")
    
    return ref_ids

def create_test_items(user_id, ref_ids):
    """Create items (user-ref associations)"""
    pb_url = "http://localhost:8090"
    
    for ref_id in ref_ids:
        item_data = {
            "creator": user_id,
            "ref": ref_id,
            "backlog": True
        }
        
        try:
            response = requests.post(
                f"{pb_url}/api/collections/items/records",
                json=item_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print(f"✅ Created item association for ref {ref_id}")
            else:
                print(f"❌ Failed to create item: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating item: {e}")

def main():
    print("🧪 Creating test user and refs in PocketBase...\n")
    
    # Create test user
    user_id = create_test_user()
    if not user_id:
        print("Failed to create user, stopping.")
        return
    
    # Create test refs
    ref_ids = create_test_refs(user_id)
    if not ref_ids:
        print("Failed to create refs, stopping.")
        return
    
    # Create items (associations)
    create_test_items(user_id, ref_ids)
    
    print(f"\n🎉 Test data created! User ID: {user_id}")
    print("Now try running: python3 sync_users.py")

if __name__ == "__main__":
    main() 