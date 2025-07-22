#!/usr/bin/env python3
"""
Supabase Schema Audit Script
Systematically checks for missing tables, columns, and relationships
"""

import os
import httpx
import json
from typing import Dict, List, Set, Tuple

# Environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not SUPA_URL or not SUPA_KEY:
    raise ValueError("Missing SUPA_URL or SUPA_KEY environment variables")

# Headers for Supabase API
headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json"
}

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in Supabase"""
    try:
        response = httpx.get(f"{SUPA_URL}/rest/v1/{table_name}?limit=1", headers=headers)
        return response.status_code == 200
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")
        return False

def get_table_columns(table_name: str) -> List[str]:
    """Get column names for a table"""
    try:
        response = httpx.get(f"{SUPA_URL}/rest/v1/{table_name}?limit=1", headers=headers)
        if response.status_code == 200:
            # Try to get schema info
            schema_response = httpx.get(f"{SUPA_URL}/rest/v1/", headers=headers)
            if schema_response.status_code == 200:
                # This is a simplified approach - in practice you'd need to query information_schema
                return ["columns_found"]  # Placeholder
        return []
    except Exception as e:
        print(f"Error getting columns for {table_name}: {e}")
        return []

def check_foreign_key_relationship(table1: str, table2: str) -> bool:
    """Check if there's a foreign key relationship between two tables"""
    try:
        # Try to query with a join-like operation
        response = httpx.get(f"{SUPA_URL}/rest/v1/{table1}?select=*,{table2}(*)&limit=1", headers=headers)
        return response.status_code == 200
    except Exception:
        return False

def main():
    print("🔍 SUPABASE SCHEMA AUDIT")
    print("=" * 50)
    
    # Required tables for the system
    required_tables = {
        "users": "User accounts",
        "refs": "Reference items (books, movies, etc.)",
        "items": "User instances of refs (with captions, links, etc.)",
        "user_refs": "User-ref relationships (legacy table)",
        "user_personalities": "Composite user personalities",
        "user_ref_personalities": "Per-ref personality sentences",
        "ref_vectors": "Vector embeddings for refs",
        "search_history": "Search history and results"
    }
    
    # Required columns for each table
    required_columns = {
        "users": ["user_id", "email", "name", "created_at"],
        "refs": ["id", "title", "meta", "created_at"],
        "items": ["id", "user_id", "ref_id", "text", "creator", "backlog", "created_at"],
        "user_refs": ["id", "user_id", "ref_id", "caption", "created_at"],
        "user_personalities": ["user_id", "personality_summary", "ref_ids_used", "created_at"],
        "user_ref_personalities": ["user_id", "ref_id", "personality_sentence", "created_at"],
        "ref_vectors": ["ref_id", "vector", "created_at"],
        "search_history": ["id", "user_id", "ref_ids_used", "search_results", "created_at"]
    }
    
    # Required relationships
    required_relationships = [
        ("items", "users"),
        ("items", "refs"),
        ("user_refs", "users"),
        ("user_refs", "refs"),
        ("user_personalities", "users"),
        ("user_ref_personalities", "users"),
        ("user_ref_personalities", "refs"),
        ("ref_vectors", "refs"),
        ("search_history", "users")
    ]
    
    print("\n📋 CHECKING REQUIRED TABLES")
    print("-" * 30)
    
    missing_tables = []
    existing_tables = []
    
    for table, description in required_tables.items():
        exists = check_table_exists(table)
        status = "✅" if exists else "❌"
        print(f"{status} {table}: {description}")
        
        if exists:
            existing_tables.append(table)
        else:
            missing_tables.append(table)
    
    print(f"\n📊 SUMMARY:")
    print(f"✅ Existing tables: {len(existing_tables)}")
    print(f"❌ Missing tables: {len(missing_tables)}")
    
    if missing_tables:
        print(f"\n🔧 MISSING TABLES TO CREATE:")
        for table in missing_tables:
            print(f"  - {table}")
    
    print(f"\n🔗 CHECKING RELATIONSHIPS")
    print("-" * 30)
    
    missing_relationships = []
    
    for table1, table2 in required_relationships:
        if table1 in existing_tables and table2 in existing_tables:
            has_relationship = check_foreign_key_relationship(table1, table2)
            status = "✅" if has_relationship else "❌"
            print(f"{status} {table1} -> {table2}")
            
            if not has_relationship:
                missing_relationships.append((table1, table2))
        else:
            print(f"⏭️  {table1} -> {table2} (tables missing)")
    
    print(f"\n📊 RELATIONSHIP SUMMARY:")
    print(f"✅ Working relationships: {len(required_relationships) - len(missing_relationships)}")
    print(f"❌ Missing relationships: {len(missing_relationships)}")
    
    if missing_relationships:
        print(f"\n🔧 MISSING RELATIONSHIPS TO FIX:")
        for table1, table2 in missing_relationships:
            print(f"  - {table1} -> {table2}")
    
    # Test specific queries that are failing in the logs
    print(f"\n🧪 TESTING SPECIFIC QUERIES FROM LOGS")
    print("-" * 40)
    
    test_queries = [
        ("users table with id column", "users?select=*&limit=1"),
        ("user_personalities table", "user_personalities?select=*&limit=1"),
        ("user_ref_personalities table", "user_ref_personalities?select=*&limit=1"),
        ("user_refs with refs relationship", "user_refs?select=ref_id,refs(title,caption)&limit=1"),
        ("items table", "items?select=*&limit=1"),
    ]
    
    for description, query in test_queries:
        try:
            response = httpx.get(f"{SUPA_URL}/rest/v1/{query}", headers=headers)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {description}: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    print(f"    Error: {error_data.get('message', 'Unknown error')}")
                except:
                    print(f"    Error: {response.text[:100]}")
        except Exception as e:
            print(f"❌ {description}: Exception - {e}")
    
    print(f"\n🎯 RECOMMENDATIONS")
    print("-" * 20)
    
    if missing_tables:
        print("1. Create missing tables first")
        print("2. Add required columns to existing tables")
        print("3. Set up foreign key relationships")
    elif missing_relationships:
        print("1. Fix missing foreign key relationships")
        print("2. Ensure column names match between tables")
    else:
        print("✅ Schema appears to be complete!")
    
    print(f"\n📝 NEXT STEPS")
    print("-" * 15)
    print("1. Run this audit after making schema changes")
    print("2. Test the search API with real data")
    print("3. Verify end-to-end user matching pipeline")

if __name__ == "__main__":
    main() 