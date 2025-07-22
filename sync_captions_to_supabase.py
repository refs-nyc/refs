#!/usr/bin/env python3
"""
Sync captions from PocketBase items.text to Supabase user_refs.caption
"""

import os
import sqlite3
from supabase import create_client, Client
from pathlib import Path

# Configuration
POCKETBASE_DB = Path.cwd() / ".pocketbase" / "pb_data" / "data.db"
SUPABASE_URL = os.getenv('SUPA_URL')
SUPABASE_KEY = os.getenv('SUPA_KEY')

def get_captions_from_pocketbase():
    """Extract user captions from PocketBase items.text field"""
    conn = sqlite3.connect(POCKETBASE_DB)
    cursor = conn.cursor()
    
    # Get items with captions (where text field is not empty)
    cursor.execute("""
        SELECT creator as user_id, ref as ref_id, text as caption
        FROM Items 
        WHERE creator IS NOT NULL 
          AND ref IS NOT NULL 
          AND text IS NOT NULL 
          AND text != ''
    """)
    
    captions = cursor.fetchall()
    conn.close()
    
    return captions

def sync_captions_to_supabase(captions):
    """Update Supabase user_refs table with caption data"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPA_URL or SUPA_KEY environment variables")
        return False
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print(f"📝 Syncing {len(captions)} captions to Supabase...")
        
        success_count = 0
        for user_id, ref_id, caption in captions:
            try:
                # Update the user_refs table with the caption
                result = supabase.table('user_refs').update({
                    'caption': caption
                }).eq('user_id', user_id).eq('ref_id', ref_id).execute()
                
                if result.data:
                    success_count += 1
                    if success_count % 10 == 0:
                        print(f"   ✅ Updated {success_count}/{len(captions)} captions")
                
            except Exception as e:
                print(f"   ❌ Error updating caption for {user_id}/{ref_id}: {e}")
        
        print(f"✅ Successfully synced {success_count}/{len(captions)} captions")
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return False

def main():
    print("🔄 Syncing captions from PocketBase to Supabase")
    print("=" * 50)
    
    # Get captions from PocketBase
    print("📖 Reading captions from PocketBase...")
    captions = get_captions_from_pocketbase()
    print(f"Found {len(captions)} items with captions")
    
    if captions:
        # Show some examples
        print("\n📋 Sample captions:")
        for i, (user_id, ref_id, caption) in enumerate(captions[:3]):
            print(f"   {i+1}. User {user_id[:8]}... → Ref {ref_id[:8]}...")
            print(f"      Caption: \"{caption[:60]}{'...' if len(caption) > 60 else ''}\"")
        
        if len(captions) > 3:
            print(f"   ... and {len(captions) - 3} more")
        
        # Sync to Supabase
        print(f"\n🚀 Syncing to Supabase...")
        sync_captions_to_supabase(captions)
    else:
        print("No captions found in PocketBase")
    
    print("\n" + "=" * 50)
    print("💡 This ensures personality generation has access to user captions!")

if __name__ == "__main__":
    main() 