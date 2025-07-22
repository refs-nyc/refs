#!/usr/bin/env python3

import os
from supabase import create_client

# Get environment variables
SUPA_URL = os.getenv("SUPA_URL")
SUPA_KEY = os.getenv("SUPA_KEY")

if not SUPA_URL or not SUPA_KEY:
    print("Missing required environment variables: SUPA_URL, SUPA_KEY")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPA_URL, SUPA_KEY)

user_id = "rpr8bjg26q72z81"
limit = 12

print(f"Testing ref lookup for user {user_id}")

# Step 1: Get user's refs
print("\n1. Getting user_refs...")
try:
    user_refs_result = supabase.table('user_refs').select(
        'ref_id'
    ).eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
    
    print(f"User refs result: {user_refs_result.data}")
    
    if not user_refs_result.data:
        print("No refs found for user!")
        exit(0)
    
    # Step 2: Get ref details
    ref_ids = [item['ref_id'] for item in user_refs_result.data]
    print(f"Ref IDs: {ref_ids}")
    
    print("\n2. Getting ref details...")
    refs_result = supabase.table('refs').select(
        'id, title, meta'
    ).in_('id', ref_ids).execute()
    
    print(f"Refs result: {refs_result.data}")
    
    # Step 3: Combine data
    refs_dict = {ref['id']: ref for ref in refs_result.data}
    print(f"Refs dict: {refs_dict}")
    
    refs_data = []
    for item in user_refs_result.data:
        ref_id = item['ref_id']
        ref_info = refs_dict.get(ref_id)
        print(f"Processing ref_id {ref_id}: {ref_info}")
        if ref_info:
            refs_data.append({
                'title': ref_info['title'],
                'caption': ref_info.get('meta', {}).get('caption', '') if ref_info.get('meta') else ''
            })
    
    print(f"\nFinal refs_data: {refs_data}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc() 