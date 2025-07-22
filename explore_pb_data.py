#!/usr/bin/env python3
"""
Explore all PocketBase collections to understand the data model
"""

import sqlite3
import os
import json

def explore_pocketbase_data():
    """Explore all collections in PocketBase"""
    # Use the pb_data database which has the actual collections
    db_path = ".pocketbase/pb_data/data.db"
    
    if not os.path.exists(db_path):
        print("❌ PocketBase pb_data database not found")
        return
    
    print(f"Using database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all non-system tables (specifically the collections we care about)
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name IN ('users', 'items', 'refs', 'profiles')
            ORDER BY name
        """)
        tables = [table[0] for table in cursor.fetchall()]
        
        print("🔍 Exploring PocketBase Collections:")
        print("=" * 50)
        
        for table_name in tables:
            print(f"\n📊 Collection: {table_name}")
            print("-" * 30)
            
            # Get record count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Records: {count}")
            
            if count > 0:
                # Get column info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                print("Columns:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")
                
                # Get sample records
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                records = cursor.fetchall()
                
                if records:
                    print("\nSample records:")
                    col_names = [col[1] for col in columns]
                    
                    for i, record in enumerate(records[:2]):  # Show first 2 records
                        print(f"  Record {i+1}:")
                        for j, value in enumerate(record):
                            if col_names[j] in ['password', 'tokenKey']:
                                value = "***hidden***"
                            elif isinstance(value, str) and len(value) > 50:
                                value = value[:47] + "..."
                            print(f"    {col_names[j]}: {value}")
                        print()
            
            print()
        
        # Look for relationships
        print("\n🔗 Analyzing Relationships:")
        print("=" * 30)
        
        # Check items -> users relationship
        if 'items' in tables and 'users' in tables:
            cursor.execute("""
                SELECT COUNT(*) as total_items,
                       COUNT(DISTINCT creator) as unique_users
                FROM items 
                WHERE creator IS NOT NULL
            """)
            result = cursor.fetchone()
            if result and result[0] > 0:
                print(f"Items: {result[0]} total, created by {result[1]} unique users")
        
        # Check items -> refs relationship
        if 'items' in tables and 'refs' in tables:
            cursor.execute("""
                SELECT COUNT(*) as items_with_refs
                FROM items 
                WHERE ref IS NOT NULL
            """)
            result = cursor.fetchone()
            if result:
                print(f"Items with refs: {result[0]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error exploring database: {e}")

def main():
    print("🗂️  Exploring PocketBase Data Structure\n")
    explore_pocketbase_data()

if __name__ == "__main__":
    main() 