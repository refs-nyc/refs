#!/usr/bin/env python3
"""
Direct test of search functionality using HTTP calls instead of the Supabase client
"""

import os
import json
import requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def test_openai():
    """Test OpenAI API calls"""
    print("🤖 Testing OpenAI API...")
    
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Test title generation
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You create fun, 7-word titles for people who share interests."},
                {"role": "user", "content": "Create a exactly 7-word title for people who like: coffee, books, hiking"}
            ],
            max_tokens=20,
            temperature=0.8
        )
        
        title = response.choices[0].message.content.strip()
        print(f"   ✅ Generated title: '{title}'")
        
        # Test embedding
        embedding_response = client.embeddings.create(
            model="text-embedding-3-small",
            input=title
        )
        
        vector = embedding_response.data[0].embedding
        print(f"   ✅ Generated embedding: {len(vector)} dimensions")
        
        return title, vector
        
    except Exception as e:
        print(f"   ❌ OpenAI error: {e}")
        return None, None

def test_supabase_direct(title_vector):
    """Test Supabase using direct HTTP calls"""
    print("\n🚀 Testing Supabase with direct HTTP...")
    
    supa_url = os.getenv("SUPA_URL")
    supa_key = os.getenv("SUPA_KEY")
    
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test users table
        response = requests.get(f"{supa_url}/rest/v1/users?select=*&limit=1", headers=headers)
        print(f"   Users table: {response.status_code} - {len(response.json()) if response.status_code == 200 else response.text}")
        
        # Test ref_vectors table
        response = requests.get(f"{supa_url}/rest/v1/ref_vectors?select=*&limit=1", headers=headers)
        print(f"   Ref_vectors table: {response.status_code} - {len(response.json()) if response.status_code == 200 else response.text}")
        
        # Test user_refs table
        response = requests.get(f"{supa_url}/rest/v1/user_refs?select=*&limit=1", headers=headers)
        print(f"   User_refs table: {response.status_code} - {len(response.json()) if response.status_code == 200 else response.text}")
        
        # Test the rank_people function with dummy data
        if title_vector:
            print("\n   Testing rank_people function...")
            rpc_data = {
                "p_user": "test_user",
                "p_ref1": "ref1", 
                "p_ref2": "ref2",
                "p_ref3": "ref3",
                "p_vec": title_vector
            }
            
            response = requests.post(
                f"{supa_url}/rest/v1/rpc/rank_people",
                headers=headers,
                json=rpc_data
            )
            
            print(f"   Search function: {response.status_code}")
            if response.status_code == 200:
                results = response.json()
                print(f"   ✅ Found {len(results)} people")
                return True
            else:
                print(f"   ❌ Error: {response.text}")
                return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Supabase error: {e}")
        return False

def test_full_search_api():
    """Test the complete search API endpoint"""
    print("\n🔍 Testing complete search API...")
    
    try:
        # Test data
        test_request = {
            "user_id": "test_user_123",
            "ref_ids": ["ref1", "ref2", "ref3"]
        }
        
        response = requests.post(
            "http://localhost:8000/search_people",
            headers={"Content-Type": "application/json"},
            json=test_request,
            timeout=30
        )
        
        print(f"   API Response: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Title: '{result.get('title', 'No title')}'")
            print(f"   ✅ Found {len(result.get('people', []))} people")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Search API not running. Start it with: python3 search_api.py")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("🧪 Testing Complete Search Pipeline...\n")
    
    # Test OpenAI
    title, vector = test_openai()
    
    # Test Supabase directly
    supabase_ok = test_supabase_direct(vector)
    
    # Test full API (if running)
    api_ok = test_full_search_api()
    
    print(f"\n📊 Results:")
    print(f"   OpenAI: {'✅' if title and vector else '❌'}")
    print(f"   Supabase: {'✅' if supabase_ok else '❌'}")
    print(f"   Search API: {'✅' if api_ok else '❌'}")
    
    if title and vector and supabase_ok:
        print(f"\n🎉 Core functionality is working!")
        print(f"   Next: Create real users/refs and sync them to Supabase")
    else:
        print(f"\n❌ Some components need fixing")

if __name__ == "__main__":
    main() 