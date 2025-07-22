#!/usr/bin/env python3
"""
Apply Schema Fixes Script
Safely applies the foreign key relationships and other schema fixes
"""

import os
import httpx
import json
import time
from typing import List, Dict

# Environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not SUPA_URL or not SUPA_KEY:
    raise ValueError("Missing SUPA_URL or SUPA_KEY environment variables")

# Headers for Supabase API
headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def execute_sql(sql: str) -> bool:
    """Execute SQL via Supabase REST API"""
    try:
        # Use the rpc endpoint to execute SQL
        response = httpx.post(
            f"{SUPA_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": sql}
        )
        
        if response.status_code == 200:
            return True
        else:
            print(f"❌ SQL execution failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Exception executing SQL: {e}")
        return False

def apply_schema_fixes():
    """Apply all schema fixes step by step"""
    print("🔧 APPLYING SCHEMA FIXES")
    print("=" * 40)
    
    # SQL commands to execute
    fixes = [
        {
            "name": "Add items -> users foreign key",
            "sql": "ALTER TABLE items ADD CONSTRAINT fk_items_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
        },
        {
            "name": "Add items -> refs foreign key", 
            "sql": "ALTER TABLE items ADD CONSTRAINT fk_items_ref_id FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;"
        },
        {
            "name": "Add user_refs -> users foreign key",
            "sql": "ALTER TABLE user_refs ADD CONSTRAINT fk_user_refs_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
        },
        {
            "name": "Add user_refs -> refs foreign key",
            "sql": "ALTER TABLE user_refs ADD CONSTRAINT fk_user_refs_ref_id FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;"
        },
        {
            "name": "Add ref_vectors -> refs foreign key",
            "sql": "ALTER TABLE ref_vectors ADD CONSTRAINT fk_ref_vectors_ref_id FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE;"
        },
        {
            "name": "Add ref_ids_used column to user_personalities",
            "sql": "ALTER TABLE user_personalities ADD COLUMN IF NOT EXISTS ref_ids_used TEXT[];"
        },
        {
            "name": "Create indexes for performance",
            "sql": """
            CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
            CREATE INDEX IF NOT EXISTS idx_items_ref_id ON items(ref_id);
            CREATE INDEX IF NOT EXISTS idx_user_refs_user_id ON user_refs(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_refs_ref_id ON user_refs(ref_id);
            CREATE INDEX IF NOT EXISTS idx_ref_vectors_ref_id ON ref_vectors(ref_id);
            """
        }
    ]
    
    successful_fixes = []
    failed_fixes = []
    
    for i, fix in enumerate(fixes, 1):
        print(f"\n{i}/{len(fixes)} 🔧 {fix['name']}")
        print("-" * 30)
        
        success = execute_sql(fix['sql'])
        
        if success:
            print(f"✅ {fix['name']} - SUCCESS")
            successful_fixes.append(fix['name'])
        else:
            print(f"❌ {fix['name']} - FAILED")
            failed_fixes.append(fix['name'])
        
        # Small delay between operations
        time.sleep(0.5)
    
    print(f"\n📊 SUMMARY")
    print("=" * 20)
    print(f"✅ Successful fixes: {len(successful_fixes)}")
    print(f"❌ Failed fixes: {len(failed_fixes)}")
    
    if successful_fixes:
        print(f"\n✅ SUCCESSFUL FIXES:")
        for fix in successful_fixes:
            print(f"  - {fix}")
    
    if failed_fixes:
        print(f"\n❌ FAILED FIXES:")
        for fix in failed_fixes:
            print(f"  - {fix}")
    
    return len(failed_fixes) == 0

def test_relationships():
    """Test if the relationships are working"""
    print(f"\n🧪 TESTING RELATIONSHIPS")
    print("=" * 30)
    
    test_queries = [
        {
            "name": "items -> users relationship",
            "query": "items?select=id,user_id,users(user_id)&limit=1"
        },
        {
            "name": "items -> refs relationship", 
            "query": "items?select=id,ref_id,refs(id,title)&limit=1"
        },
        {
            "name": "user_refs -> users relationship",
            "query": "user_refs?select=id,user_id,users(user_id)&limit=1"
        },
        {
            "name": "user_refs -> refs relationship",
            "query": "user_refs?select=id,ref_id,refs(id,title)&limit=1"
        },
        {
            "name": "ref_vectors -> refs relationship",
            "query": "ref_vectors?select=ref_id,refs(id,title)&limit=1"
        }
    ]
    
    working_relationships = []
    broken_relationships = []
    
    for test in test_queries:
        try:
            response = httpx.get(f"{SUPA_URL}/rest/v1/{test['query']}", headers=headers)
            
            if response.status_code == 200:
                print(f"✅ {test['name']} - WORKING")
                working_relationships.append(test['name'])
            else:
                print(f"❌ {test['name']} - BROKEN ({response.status_code})")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('message', 'Unknown error')}")
                except:
                    print(f"   Error: {response.text[:100]}")
                broken_relationships.append(test['name'])
                
        except Exception as e:
            print(f"❌ {test['name']} - EXCEPTION: {e}")
            broken_relationships.append(test['name'])
    
    print(f"\n📊 RELATIONSHIP TEST RESULTS:")
    print(f"✅ Working: {len(working_relationships)}")
    print(f"❌ Broken: {len(broken_relationships)}")
    
    return len(broken_relationships) == 0

def main():
    print("🚀 STARTING SCHEMA FIXES")
    print("=" * 40)
    
    # Apply the fixes
    fixes_successful = apply_schema_fixes()
    
    if fixes_successful:
        print(f"\n🎉 All schema fixes applied successfully!")
        
        # Test the relationships
        relationships_working = test_relationships()
        
        if relationships_working:
            print(f"\n🎉 All relationships are working!")
            print(f"\n✅ SCHEMA IS READY FOR TESTING")
        else:
            print(f"\n⚠️  Some relationships are still broken")
            print(f"   You may need to check the data or column names")
    else:
        print(f"\n⚠️  Some fixes failed")
        print(f"   Check the errors above and try again")
    
    print(f"\n📝 NEXT STEPS:")
    print(f"1. Run the audit script again to verify: python3 audit_supabase_schema.py")
    print(f"2. Test the search API with real data")
    print(f"3. Verify the end-to-end user matching pipeline")

if __name__ == "__main__":
    main() 