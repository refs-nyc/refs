#!/usr/bin/env python3
import os
import httpx
import asyncio
from typing import Dict, List, Any

# Environment variables
SUPA_URL = os.getenv("SUPA_URL", "https://zrxgnplwnfaxtpffrqxo.supabase.co")
SUPA_KEY = os.getenv("SUPA_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGducGx3bmZheHRwZmZycXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA3MDgzOSwiZXhwIjoyMDY3NjQ2ODM5fQ.7qfmXc1hACRrVkU02J05xiaqhtO95sHMcLqf9yrNxc4")

headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json"
}

async def run_migration():
    async with httpx.AsyncClient() as client:
        print("🚀 Running fixed migration...")
        
        # Read the SQL file
        with open('fix_migration.sql', 'r') as f:
            sql_content = f.read()
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements, 1):
            if not statement or statement.startswith('--'):
                continue
                
            print(f"📝 Executing statement {i}/{len(statements)}...")
            
            try:
                response = await client.post(
                    f"{SUPA_URL}/rest/v1/rpc/exec_sql",
                    headers=headers,
                    json={"sql": statement}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Statement {i} executed successfully")
                    if result:
                        print(f"   Result: {result}")
                else:
                    print(f"❌ Statement {i} failed: {response.status_code}")
                    print(f"   Error: {response.text}")
                    
            except Exception as e:
                print(f"❌ Error executing statement {i}: {e}")
        
        print("🎉 Migration completed!")

if __name__ == "__main__":
    asyncio.run(run_migration()) 