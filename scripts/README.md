# Scripts Directory

This directory contains all the utility scripts for the Refs project, organized by purpose.

## 📁 Directory Structure

### `/setup/` - Database Setup Scripts
Scripts for initial database setup and configuration.

- **`setup-supabase-complete.js`** - Complete Supabase database setup (schema + functions)
- **`supabase-schema.sql`** - Supabase table definitions and structure
- **`supabase-functions.sql`** - Database functions for search and embeddings

### `/data/` - Data Processing & Sync Scripts
Scripts for data synchronization and processing.

- **`generate-seven-strings.ts`** - Generate 7-word descriptions and embeddings for items
- **`generate-seven-strings-for-all.ts`** - Process all existing items with 7-strings
- **`sync-pocketbase-to-supabase.ts`** - Sync users and data from PocketBase to Supabase
- **`populate-supabase-from-pocketbase.js`** - Initial data population from PocketBase
- **`populate-supabase-simple.js`** - Simple data population script
- **`populate-existing-items.js`** - Populate existing items with embeddings
- **`simple-populate.js`** - Basic population script
- **`update-ticker-refs.sql`** - Update which refs appear in the ticker

### `/deploy/` - Deployment Scripts
Scripts for deploying the application.

- **`deploy-supabase.sh`** - Deploy Supabase functions and schema

### `/archive/` - One-time Fix Scripts
**DEPRECATED** - These scripts were used for one-time fixes and are no longer needed.

- Various `fix-*.js` and `fix-*.sql` files that addressed specific database issues
- `restore-pocketbase-items.js` - Restored deleted items
- `undelete-items.ts` - Undeleted items
- `create-new-items-table.js` - Created items table
- `set-openai-secret.js` - Set OpenAI API key
- And other one-time setup/fix scripts

## 🚀 Usage

### Initial Setup
```bash
# Set up Supabase database
cd scripts/setup
node setup-supabase-complete.js
```

### Data Processing
```bash
# Generate 7-strings for all items
cd scripts/data
npx tsx generate-seven-strings.ts

# Sync data from PocketBase to Supabase
npx tsx sync-pocketbase-to-supabase.ts
```

### Deployment
```bash
# Deploy to Supabase
cd scripts/deploy
./deploy-supabase.sh
```

## 📝 Notes

- **Archive scripts**: The `/archive/` directory contains scripts that were used for one-time fixes. These are kept for reference but should not be run again.
- **Environment variables**: Most scripts require environment variables to be set (see individual scripts for details).
- **Dependencies**: TypeScript scripts require `tsx` or `ts-node` to run.
- **Database access**: Scripts require proper database credentials and API keys to function.

## 🔧 Maintenance

When adding new scripts:
1. Place them in the appropriate directory based on their purpose
2. Update this README with a description
3. Add any required environment variables or dependencies
4. Test the script thoroughly before committing 