# Scripts Documentation

This directory contains various scripts for managing the refs application, particularly for data synchronization between PocketBase and Supabase.

## Service Management Scripts

### `start-services.sh`
**Purpose**: Starts all required services for development
**Usage**: `./scripts/start-services.sh`
**What it does**:
- Starts PocketBase server on port 8090
- Starts webhook server on port 3002
- Checks if services are already running to avoid duplicates
- Provides status information

### `stop-services.sh`
**Purpose**: Stops all running services
**Usage**: `./scripts/stop-services.sh`
**What it does**:
- Stops PocketBase server
- Stops webhook server
- Stops matchmaking server (if running)
- Provides confirmation of stopped services

## Data Synchronization Scripts

### `webhook-sync.js`
**Purpose**: Event-driven webhook server that processes item changes
**Usage**: `node scripts/webhook-sync.js`
**What it does**:
- Listens for item creation/update events from the app
- Calls Supabase Edge Function to generate 7-strings and embeddings
- Regenerates user spirit vectors when items change
- Runs on port 3002 (configurable via WEBHOOK_PORT env var)

### `data/sync-pocketbase-to-supabase.ts`
**Purpose**: Manual one-time sync of all data from PocketBase to Supabase
**Usage**: `npx tsx scripts/data/sync-pocketbase-to-supabase.ts`
**What it does**:
- Syncs all users from PocketBase to Supabase
- Syncs all refs from PocketBase to Supabase  
- Syncs all items from PocketBase to Supabase
- **Note**: Does NOT generate 7-strings or embeddings (use webhook system for that)

### `test-webhook-flow.js`
**Purpose**: Test the webhook system by simulating an item creation
**Usage**: `node scripts/test-webhook-flow.js`
**What it does**:
- Creates a test item with sample data
- Calls the webhook endpoint
- Verifies the item was processed in Supabase
- Useful for debugging webhook functionality

## Data Generation Scripts

### `data/generate-seven-strings-for-all.ts`
**Purpose**: Generate 7-strings and embeddings for all existing items
**Usage**: `npx tsx scripts/data/generate-seven-strings-for-all.ts`
**What it does**:
- Finds all items in Supabase without 7-strings
- Generates 7-strings and embeddings for each item
- Updates user spirit vectors
- **Use case**: One-time migration of existing data

### `data/generate-seven-strings.ts`
**Purpose**: Generate 7-strings and embeddings for items created after a specific date
**Usage**: `npx tsx scripts/data/generate-seven-strings.ts`
**What it does**:
- Finds items created after a specified timestamp
- Generates 7-strings and embeddings for those items
- Updates user spirit vectors
- **Use case**: Batch processing of recent items

## Database Setup Scripts

### `setup/setup-supabase-complete.js`
**Purpose**: Complete Supabase setup including schema and functions
**Usage**: `node scripts/setup/setup-supabase-complete.js`
**What it does**:
- Creates all necessary tables (users, refs, items)
- Sets up vector extensions
- Creates embedding functions
- Deploys Edge Functions

### `setup/setup-supabase.js`
**Purpose**: Basic Supabase setup
**Usage**: `node scripts/setup/setup-supabase.js`
**What it does**:
- Creates basic schema
- Sets up vector storage
- **Use case**: Initial project setup

## Archive Scripts (Legacy)

### `archive/add-columns-via-api.js`
**Purpose**: Add new columns to existing tables via API
**Usage**: `node scripts/archive/add-columns-via-api.js`
**Status**: Legacy - used for schema migrations

### `archive/fix-embeddings.ts`
**Purpose**: Fix embedding issues in existing data
**Usage**: `npx tsx scripts/archive/fix-embeddings.ts`
**Status**: Legacy - used for data cleanup

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPA_URL=your_supabase_url
EXPO_PUBLIC_SUPA_KEY=your_supabase_anon_key

# Webhook Configuration  
EXPO_PUBLIC_WEBHOOK_URL=http://localhost:3002
WEBHOOK_PORT=3002

# PocketBase Configuration
EXPO_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

## Typical Development Workflow

1. **Start services**: `./scripts/start-services.sh`
2. **Make changes in app** (create/edit items)
3. **Webhook automatically processes changes** (no manual intervention needed)
4. **Stop services**: `./scripts/stop-services.sh`

## Troubleshooting

### Webhook not working?
- Check if webhook server is running: `lsof -i :3002`
- Check webhook logs in the terminal where you started it
- Test with: `node scripts/test-webhook-flow.js`

### Items not syncing?
- Run manual sync: `npx tsx scripts/data/sync-pocketbase-to-supabase.ts`
- Check PocketBase is running: `lsof -i :8090`
- Verify environment variables are set correctly

### 7-strings not generating?
- Check OpenAI API key is valid
- Check Supabase Edge Function is deployed: `npx supabase functions deploy openai`
- Test webhook flow: `node scripts/test-webhook-flow.js`

## Notes

- The webhook system is the **primary** method for automatic sync
- Manual scripts are for one-time operations or troubleshooting
- Always use `./scripts/start-services.sh` to ensure all services are running
- The system is designed to be event-driven, not polling-based
