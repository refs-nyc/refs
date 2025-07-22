#!/usr/bin/env python3
"""
Restore PocketBase backup from ~/Downloads/pb_backup_refs_nyc_20250710074022
"""

import os
import shutil
import sqlite3
from pathlib import Path

def main():
    # Paths
    backup_dir = Path.home() / "Downloads" / "pb_backup_refs_nyc_20250710074022"
    pocketbase_dir = Path.cwd() / ".pocketbase" / "pb_data"
    
    print("🔄 PocketBase Backup Restoration")
    print(f"📂 Backup source: {backup_dir}")
    print(f"📂 PocketBase destination: {pocketbase_dir}")
    
    # Verify backup exists
    if not backup_dir.exists():
        print("❌ Backup directory not found!")
        return False
        
    backup_data_db = backup_dir / "data.db"
    backup_aux_db = backup_dir / "auxiliary.db"
    
    if not backup_data_db.exists():
        print("❌ Backup data.db not found!")
        return False
        
    # Create backup of current data
    if pocketbase_dir.exists():
        backup_current = pocketbase_dir.parent / "pb_data_backup_current"
        if backup_current.exists():
            shutil.rmtree(backup_current)
        print(f"💾 Backing up current data to: {backup_current}")
        shutil.copytree(pocketbase_dir, backup_current)
    
    # Ensure pb_data directory exists
    pocketbase_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy backup files
    print("📋 Copying backup files...")
    
    files_to_copy = ["data.db", "auxiliary.db", "data.db-shm", "data.db-wal", 
                     "auxiliary.db-shm", "auxiliary.db-wal"]
    
    for file_name in files_to_copy:
        src_file = backup_dir / file_name
        dst_file = pocketbase_dir / file_name
        
        if src_file.exists():
            shutil.copy2(src_file, dst_file)
            print(f"✅ Copied {file_name}")
        else:
            print(f"⚠️  {file_name} not found in backup (this may be normal)")
    
    # Quick verification - check user count
    try:
        conn = sqlite3.connect(pocketbase_dir / "data.db")
        cursor = conn.cursor()
        
        # Get users count
        cursor.execute("SELECT COUNT(*) FROM _pb_users_auth_")
        user_count = cursor.fetchone()[0]
        
        # Get sample user names
        cursor.execute("SELECT userName FROM _pb_users_auth_ LIMIT 5")
        sample_users = [row[0] for row in cursor.fetchall()]
        
        # Get items count
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'pbc_%'")
        tables = cursor.fetchall()
        
        item_counts = {}
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            count = cursor.fetchone()[0]
            item_counts[table_name] = count
        
        conn.close()
        
        print("\n📊 Restoration Summary:")
        print(f"👥 Users restored: {user_count}")
        print(f"👤 Sample users: {', '.join(sample_users)}")
        print("\n📦 Collection counts:")
        for table, count in item_counts.items():
            print(f"   {table}: {count} records")
            
        print("\n✅ Backup restoration completed successfully!")
        print("🚀 You can now start PocketBase with the restored data")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying restoration: {e}")
        return False

if __name__ == "__main__":
    main() 