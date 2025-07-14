#!/usr/bin/env python3
"""
Quick setup checker to verify all components are working
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_env_vars():
    """Check if all required environment variables are set"""
    print("🔧 Checking environment variables...")
    
    required_vars = {
        "OPENAI_API_KEY": "OpenAI API key",
        "SUPA_URL": "Supabase URL", 
        "SUPA_KEY": "Supabase API key",
        "EXPO_PUBLIC_POCKETBASE_URL": "PocketBase URL"
    }
    
    missing = []
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your-"):
            missing.append(f"   ❌ {var} ({description})")
        else:
            print(f"   ✅ {var} is set")
    
    if missing:
        print("\n❌ Missing environment variables:")
        for m in missing:
            print(m)
        print("\n📝 Update your .env file with the correct values")
        return False
    
    print("✅ All environment variables are set!")
    return True

def check_pocketbase():
    """Check if PocketBase is running"""
    print("\n📦 Checking PocketBase connection...")
    
    pb_url = os.getenv("EXPO_PUBLIC_POCKETBASE_URL", "http://localhost:8090")
    
    try:
        response = requests.get(f"{pb_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ PocketBase is running")
            return True
        else:
            print(f"   ❌ PocketBase responded with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Cannot connect to PocketBase: {e}")
        print(f"   Make sure PocketBase is running at: {pb_url}")
        return False

def check_supabase():
    """Check if Supabase is accessible"""
    print("\n🚀 Checking Supabase connection...")
    
    supa_url = os.getenv("SUPA_URL")
    supa_key = os.getenv("SUPA_KEY")
    
    if not supa_url or not supa_key:
        print("   ❌ Supabase credentials not found")
        return False
    
    try:
        from supabase import create_client
        supabase = create_client(supa_url, supa_key)
        
        # Test connection by checking users table
        result = supabase.table('users').select('count').limit(1).execute()
        print("   ✅ Supabase is accessible")
        return True
        
    except Exception as e:
        print(f"   ❌ Cannot connect to Supabase: {e}")
        return False

def check_openai():
    """Check if OpenAI API key works"""
    print("\n🤖 Checking OpenAI API...")
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key or api_key.startswith("your-"):
        print("   ❌ OpenAI API key not found")
        return False
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Test with a simple API call
        response = client.models.list()
        print("   ✅ OpenAI API is working")
        return True
        
    except Exception as e:
        print(f"   ❌ OpenAI API error: {e}")
        return False

def main():
    print("🔍 Checking Refs People Finder setup...\n")
    
    checks = [
        check_env_vars(),
        check_pocketbase(),
        check_supabase(), 
        check_openai()
    ]
    
    success_count = sum(checks)
    total_checks = len(checks)
    
    print(f"\n📊 Setup Status: {success_count}/{total_checks} checks passed")
    
    if success_count == total_checks:
        print("🎉 All systems ready! You can proceed with the sync.")
        return True
    else:
        print("❌ Please fix the issues above before proceeding.")
        return False

if __name__ == "__main__":
    main() 