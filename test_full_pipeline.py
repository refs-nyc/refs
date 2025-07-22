#!/usr/bin/env python3
"""
Test the full people finder pipeline with fake embeddings
"""

import os
import sqlite3
import random
from supabase import create_client, Client

def generate_fake_embedding(dimension=1536):
    """Generate a fake embedding vector"""
    return [random.random() - 0.5 for _ in range(dimension)]

def test_full_pipeline():
    """Test the complete people finder pipeline"""
    
    # Connect to Supabase
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase environment variables")
        return False
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Connect to PocketBase to get real ref data
    pb_db_path = '.pocketbase/pb_data/data.db'
    if not os.path.exists(pb_db_path):
        print(f"❌ PocketBase database not found at {pb_db_path}")
        return False
    
    try:
        conn = sqlite3.connect(pb_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🔍 Step 1: Getting refs from PocketBase...")
        cursor.execute("SELECT id, title, type FROM refs LIMIT 10")
        pb_refs = cursor.fetchall()
        print(f"   Found {len(pb_refs)} refs")
        
        print("🔍 Step 2: Getting users from PocketBase...")
        cursor.execute("SELECT id, userName FROM users LIMIT 5")
        pb_users = cursor.fetchall()
        print(f"   Found {len(pb_users)} users")
        
        print("🔍 Step 3: Getting user-ref associations...")
        cursor.execute("""
            SELECT creator as user_id, ref as ref_id, text, id as item_id
            FROM items 
            WHERE ref != '' AND creator != ''
            LIMIT 20
        """)
        pb_user_refs = cursor.fetchall()
        print(f"   Found {len(pb_user_refs)} user-ref associations")
        
        conn.close()
        
        print("\n📤 Step 4: Syncing user_refs to Supabase...")
        for user_ref in pb_user_refs:
            try:
                user_ref_data = {
                    'user_id': user_ref['user_id'],
                    'ref_id': user_ref['ref_id']
                    # Note: item_id column doesn't exist in Supabase table
                }
                
                result = supabase.table('user_refs').upsert(user_ref_data).execute()
                print(f"   ✅ Synced: {user_ref['user_id']} -> {user_ref['ref_id']}")
                
            except Exception as e:
                print(f"   ❌ Error syncing user_ref: {e}")
        
        print("\n🤖 Step 5: Generating fake vectors for refs...")
        vector_count = 0
        for ref in pb_refs:
            try:
                fake_vector = generate_fake_embedding()
                
                vector_data = {
                    'ref_id': ref['id'],
                    'vector': fake_vector
                }
                
                result = supabase.table('ref_vectors').upsert(vector_data).execute()
                vector_count += 1
                print(f"   ✅ Generated vector for: {ref['title']}")
                
            except Exception as e:
                print(f"   ❌ Error generating vector for {ref['id']}: {e}")
        
        print(f"\n🎉 Pipeline test completed!")
        print(f"   📊 Generated {vector_count} vectors")
        
        # Verification
        print("\n✅ Verification:")
        user_count = supabase.table('users').select('user_id').execute()
        ref_count = supabase.table('refs').select('id').execute()
        vector_count_check = supabase.table('ref_vectors').select('ref_id').execute()
        user_ref_count = supabase.table('user_refs').select('user_id').execute()
        
        print(f"   - Users: {len(user_count.data)}")
        print(f"   - Refs: {len(ref_count.data)}")
        print(f"   - Vectors: {len(vector_count_check.data)}")
        print(f"   - User-Refs: {len(user_ref_count.data)}")
        
        if len(vector_count_check.data) > 0:
            print("🎉 SUCCESS: Full pipeline is working with fake embeddings!")
            print("   Next step: Fix OpenAI API key for real embeddings")
            return True
        else:
            print("❌ ISSUE: No vectors were generated")
            return False
        
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_full_pipeline() 