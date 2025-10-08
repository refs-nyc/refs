# Show in Directory Migration

## Overview

This migration adds a `show_in_directory` boolean flag to the users table and populates it based on two criteria:
1. User has a profile avatar (`image` or `avatar_url`)
2. User has at least 3 grid items (not in backlog, not in a list)

This replaces the previous approach of fetching all users and filtering them on every directory query, which doesn't scale.

## Database Changes

### Schema Update

Added to `features/pocketbase/schema.json`:
```json
{
  "hidden": false,
  "id": "bool3847291054",
  "name": "show_in_directory",
  "presentable": false,
  "required": false,
  "system": false,
  "type": "bool"
}
```

### TypeScript Types

Added to `features/pocketbase/pocketbase-types.ts`:
```typescript
export type UsersRecord = {
  // ... existing fields
  show_in_directory?: boolean
  // ... existing fields
}
```

## Automatic Updates

The flag is automatically maintained when:
- ✅ User adds a grid item (when total reaches 3+)
- ✅ User removes a grid item (when total drops below 3)
- ✅ User moves an item to backlog (when grid total drops below 3)
- ✅ User uploads an avatar (`image` or `avatar_url`)

See:
- `features/stores/items.ts` - `updateShowInDirectory()` helper
- `features/stores/users.ts` - Avatar update trigger

## Running the Migration

### Prerequisites

1. PocketBase must be running
2. You need admin credentials
3. Install tsx if not already: `npm install -g tsx`

### Run the Script

```bash
# Set your PocketBase admin credentials
export POCKETBASE_ADMIN_EMAIL="admin@example.com"
export POCKETBASE_ADMIN_PASSWORD="your-admin-password"

# Optional: Set PocketBase URL (defaults to http://127.0.0.1:8090)
export EXPO_PUBLIC_POCKETBASE_URL="http://localhost:8090"

# Run the migration
npx tsx scripts/migrate-show-in-directory.ts
```

Or as a one-liner:
```bash
POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password npx tsx scripts/migrate-show-in-directory.ts
```

### What It Does

1. Authenticates as admin
2. Fetches all users (paginated, 100 at a time)
3. For each user:
   - Checks if they have an avatar
   - Counts their grid items
   - Sets `show_in_directory = true` if both criteria are met
4. Only updates users where the flag value would change
5. Outputs detailed progress and summary

### Example Output

```
🚀 Starting show_in_directory migration...
📍 PocketBase URL: http://127.0.0.1:8090
✅ Admin authenticated

📄 Processing page 1...
  👤 john_doe: avatar=true, items=5, shouldShow=true
    ✅ Updated to true
  👤 jane_smith: avatar=true, items=2, shouldShow=false
    ✅ Updated to false
  👤 bob_wilson: avatar=false, items=4, shouldShow=false
    ⏭️  Already correct (false)

============================================================
🎉 Migration complete!
============================================================
📊 Total users processed: 3
✅ Users updated: 2
⏭️  Users skipped (already correct): 1
❌ Errors: 0
============================================================
```

## Directory Query Changes

### Before (Slow, doesn't scale)
```typescript
// Fetch ALL users
const res = await pb.collection('users').getList(page, perPage)

// Fetch items for ALL users
const items = await pb.collection('items').getList(1, perPage * 5, {
  filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
})

// Filter in JavaScript
const filtered = users.filter(u => {
  const hasAvatar = Boolean(u.image || u.avatar_url)
  const itemCount = items.filter(i => i.creator === u.id).length
  return hasAvatar && itemCount >= 3
})
```

### After (Fast, scales to millions)
```typescript
// Query only users who should be in directory
const res = await pb.collection('users').getList(page, perPage, {
  filter: 'show_in_directory = true',
})

// Fetch items just for display (3 per user)
const items = await pb.collection('items').getList(1, perPage * 3, {
  filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
})
```

## Rollback

If you need to rollback:
1. Remove the `show_in_directory` field from the schema
2. Revert `features/communities/feed-screen.tsx` to the previous filtering logic
3. Remove the `updateShowInDirectory` calls from:
   - `features/stores/items.ts`
   - `features/stores/users.ts`

## Performance Impact

- **Query time:** O(1) vs O(n) where n = total users
- **Database load:** Index-based query vs full table scan + item joins
- **Scalability:** Supports millions of users without performance degradation

