# Scripts Quick Reference

## Essential Scripts We Used

### Start/Stop Services
```bash
./scripts/start-services.sh    # Start PocketBase + webhook server
./scripts/stop-services.sh     # Stop all services
```

### Webhook System (Primary)
```bash
node scripts/webhook-sync.js           # Main webhook server (auto-starts with start-services.sh)
node scripts/test-webhook-flow.js      # Test the webhook system
```

### Manual Sync (One-time use)
```bash
npx tsx scripts/data/sync-pocketbase-to-supabase.ts    # Sync all data from PocketBase to Supabase
npx tsx scripts/data/generate-seven-strings-for-all.ts # Generate 7-strings for all items
```

## What Each Does

- **`start-services.sh`**: Starts PocketBase (port 8090) + webhook server (port 3002)
- **`webhook-sync.js`**: Automatically processes new/updated items → generates 7-strings → updates spirit vectors
- **`sync-pocketbase-to-supabase.ts`**: One-time manual sync of all data
- **`generate-seven-strings-for-all.ts`**: One-time generation of 7-strings for existing items

## Typical Workflow
1. `./scripts/start-services.sh`
2. Use the app (create/edit items)
3. Webhook automatically handles everything
4. `./scripts/stop-services.sh` when done

## Environment Variables Needed
```bash
EXPO_PUBLIC_SUPA_URL=your_supabase_url
EXPO_PUBLIC_SUPA_KEY=your_supabase_key
EXPO_PUBLIC_WEBHOOK_URL=http://localhost:3002
OPENAI_API_KEY=your_openai_key
```

That's it! The webhook system handles everything automatically once services are running.
