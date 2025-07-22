#!/usr/bin/env python3
"""
Create database tables using Supabase client
"""

import os
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def create_tables():
    """Create all necessary tables"""
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🚀 Creating database tables...")
    
    # Since we can't execute DDL directly through the client,
    # let's just verify if the tables exist and guide the user
    
    try:
        # Try to query each table to see if it exists
        tables_to_check = [
            'users',
            'refs', 
            'user_refs',
            'user_ref_personalities',
            'user_personalities',
            'ref_vectors'
        ]
        
        existing_tables = []
        missing_tables = []
        
        for table in tables_to_check:
            try:
                # Try a simple query to see if table exists
                result = supabase.table(table).select('*').limit(1).execute()
                existing_tables.append(table)
                print(f"✅ Table '{table}' exists")
            except Exception as e:
                missing_tables.append(table)
                print(f"❌ Table '{table}' missing: {str(e)}")
        
        print(f"\n📊 Summary:")
        print(f"   Existing tables: {len(existing_tables)}")
        print(f"   Missing tables: {len(missing_tables)}")
        
        if missing_tables:
            print(f"\n⚠️  Missing tables: {', '.join(missing_tables)}")
            print("\n🔧 Please run the following SQL in your Supabase dashboard:")
            print("=" * 60)
            
            with open('setup_supabase_schema.sql', 'r') as f:
                sql_content = f.read()
                print(sql_content)
            
            print("=" * 60)
            print("\n📝 Instructions:")
            print("1. Go to your Supabase dashboard")
            print("2. Navigate to SQL Editor")
            print("3. Copy and paste the SQL above")
            print("4. Run the query")
            print("5. Re-run this script to verify")
            
            return False
        else:
            print("🎉 All tables exist! Database is ready!")
            return True
            
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return False

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("❌ Missing required environment variables: SUPA_URL, SUPA_KEY")
        exit(1)
    
    success = create_tables()
    
    if success:
        print("✅ Database verification complete!")
    else:
        print("⚠️  Database setup required. See instructions above.") 