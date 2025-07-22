#!/usr/bin/env python3

import os
import sqlite3
from supabase import create_client
from pathlib import Path

# Get environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")
POCKETBASE_DB = Path.cwd() / ".pocketbase" / "pb_data" / "data.db"

if not SUPA_URL or not SUPA_KEY:
    print("Missing required environment variables: SUPA_URL, SUPA_KEY")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPA_URL, SUPA_KEY)

def get_pocketbase_refs():
    """Get all refs from PocketBase SQLite database"""
    try:
        conn = sqlite3.connect(POCKETBASE_DB)
        cursor = conn.cursor()
        
        # Get all refs
        cursor.execute("""
            SELECT id, title, image, creator, type, meta, url, showInTicker, created, updated
            FROM refs
        """)
        refs = cursor.fetchall()
        ref_columns = ['id', 'title', 'image', 'creator', 'type', 'meta', 'url', 'showInTicker', 'created', 'updated']
        
        conn.close()
        
        # Convert to dictionaries
        refs_dict = [dict(zip(ref_columns, ref)) for ref in refs]
        return refs_dict
        
    except Exception as e:
        print(f"Error getting refs from PocketBase: {e}")
        return []

def sync_refs_to_supabase(refs):
    """Sync refs to Supabase"""
    print(f"📦 Syncing {len(refs)} refs to Supabase...")
    
    success_count = 0
    for ref in refs:
        try:
            # Prepare ref data for Supabase (match expected schema from setup_supabase_schema.sql)
            ref_data = {
                'id': ref['id'],
                'title': ref['title'],
                'meta': ref.get('meta', '{}'),
                'image': ref.get('image', ''),
                'url': ref.get('url', ''),
                'type': ref.get('type', ''),
                'creator': ref.get('creator', ''),
                'showinticker': ref.get('showInTicker', False),
                'created': ref.get('created', ''),
                'updated': ref.get('updated', '')
            }
            
            # Upsert to Supabase (insert or update if exists)
            result = supabase.table('refs').upsert(ref_data).execute()
            success_count += 1
            print(f"✅ Synced ref: {ref['title'][:50]}...")
            
        except Exception as e:
            print(f"❌ Failed to sync ref {ref['id']}: {e}")
    
    print(f"🎉 Successfully synced {success_count}/{len(refs)} refs")

def main():
    print("🚀 Starting refs sync from PocketBase to Supabase...")
    
    # Get refs from PocketBase
    refs = get_pocketbase_refs()
    if not refs:
        print("No refs found in PocketBase")
        return
    
    print(f"Found {len(refs)} refs in PocketBase")
    
    # Sync to Supabase
    sync_refs_to_supabase(refs)
    
    print("✨ Sync complete!")

if __name__ == "__main__":
    main() 