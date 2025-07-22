#!/usr/bin/env python3
"""
Examine the structure of the backup database
"""

import sqlite3
from pathlib import Path

def examine_database(db_path, db_name):
    print(f"\n🔍 Examining {db_name}: {db_path}")
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        return
        
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"📋 Found {len(tables)} tables:")
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            count = cursor.fetchone()[0]
            print(f"   {table_name}: {count} records")
            
            # For users table, show sample data
            if 'users' in table_name.lower() or table_name == '_pb_users_auth_':
                cursor.execute(f"PRAGMA table_info(`{table_name}`)")
                columns = cursor.fetchall()
                print(f"     Columns: {[col[1] for col in columns]}")
                
                cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 3")
                sample_rows = cursor.fetchall()
                for i, row in enumerate(sample_rows):
                    print(f"     Sample {i+1}: {row[:3]}...")  # First 3 fields only
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error examining {db_name}: {e}")

def main():
    backup_dir = Path.home() / "Downloads" / "pb_backup_refs_nyc_20250710074022"
    current_dir = Path.cwd() / ".pocketbase" / "pb_data"
    
    print("🔍 Database Structure Analysis")
    
    # Examine backup databases
    examine_database(backup_dir / "data.db", "Backup data.db")
    examine_database(backup_dir / "auxiliary.db", "Backup auxiliary.db")
    
    # Examine current databases
    examine_database(current_dir / "data.db", "Current data.db")
    examine_database(current_dir / "auxiliary.db", "Current auxiliary.db")

if __name__ == "__main__":
    main() 