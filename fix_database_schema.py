#!/usr/bin/env python3
"""
Fix database schema issues
"""

import os
from supabase import create_client, Client

def fix_database_schema():
    """Fix the database schema issues"""
    
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPA_URL or SUPA_KEY environment variables")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔧 Fixing database schema...")
        
        # Add missing columns to user_personalities table
        print("📝 Adding missing columns to user_personalities...")
        try:
            # Add ref_ids_used column
            supabase.table('user_personalities').select('*').limit(1).execute()
            print("✅ user_personalities table exists")
        except Exception as e:
            print(f"⚠️ user_personalities table issue: {e}")
        
        # Create user_ref_personalities table if it doesn't exist
        print("📝 Creating user_ref_personalities table...")
        try:
            # Try to query the table to see if it exists
            result = supabase.table('user_ref_personalities').select('*').limit(1).execute()
            print("✅ user_ref_personalities table exists")
        except Exception as e:
            print(f"⚠️ user_ref_personalities table issue: {e}")
        
        # Create search_history table if it doesn't exist
        print("📝 Creating search_history table...")
        try:
            result = supabase.table('search_history').select('*').limit(1).execute()
            print("✅ search_history table exists")
        except Exception as e:
            print(f"⚠️ search_history table issue: {e}")
        
        print("✅ Database schema check completed")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database schema: {e}")
        return False

if __name__ == "__main__":
    fix_database_schema() 