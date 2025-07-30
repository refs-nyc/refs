# PocketBase + Supabase Architecture

This document describes the new architecture that separates user data storage (PocketBase) from AI/ML operations (Supabase).

## Architecture Overview

### PocketBase (User Data)
- **Purpose**: User authentication, profiles, items, refs, messages
- **Schema**: Unchanged from original design
- **Hooks**: Trigger Supabase operations when data changes

### Supabase (AI/ML Operations)
- **Purpose**: 7-string generation, embeddings, semantic search
- **Extensions**: pgvector, http
- **Functions**: OpenAI API integration for text generation and embeddings

## Data Flow

### 1. Item Creation/Update
```
User adds item to grid in PocketBase
    ↓
PocketBase hook triggers
    ↓
Supabase function generates 7-string from ref title + caption
    ↓
Supabase generates embedding for 7-string
    ↓
Data stored in Supabase items table
```

### 2. Spirit Vector Generation
```
User's grid changes (add/remove items)
    ↓
PocketBase hook triggers
    ↓
Supabase collects 7-strings from user's top 12 grid items
    ↓
Supabase combines strings and generates spirit vector embedding
    ↓
Data stored in Supabase users table
```

### 3. Search
```
User selects items for search
    ↓
Frontend sends item_ids to matchmaking server
    ↓
Matchmaking server calls Supabase search function
    ↓
Supabase performs semantic search using embeddings
    ↓
Results ranked by: exact matches → high similarity → spirit vector tiebreaker
```

## Setup Instructions

### 1. Supabase Setup
```bash
# Run the setup script
node setup-supabase.js
```

This will:
- Enable pgvector and http extensions
- Create items and users tables
- Create OpenAI integration functions
- Configure API keys

### 2. PocketBase Hooks
The hooks in `features/pocketbase/hooks/index.ts` need to be integrated with your PocketBase instance. You'll need to:

1. Set up webhooks or use PocketBase's built-in hooks system
2. Configure the hooks to trigger on item/user changes
3. Ensure proper error handling and retry logic

### 3. Environment Variables
```env
# Supabase
SUPA_URL=your_supabase_url
SUPA_KEY=your_supabase_service_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# PocketBase
EXPO_PUBLIC_POCKETBASE_URL=your_pocketbase_url
```

## Database Schema

### Supabase Tables

#### `items`
- `id` (TEXT, PRIMARY KEY) - PocketBase item ID
- `ref_id` (TEXT) - PocketBase ref ID
- `text` (TEXT) - User's caption
- `seven_string` (TEXT) - Generated 7-string
- `seven_string_embedding` (vector(1536)) - Embedding for 7-string
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `users`
- `id` (TEXT, PRIMARY KEY) - PocketBase user ID
- `name` (TEXT) - User's display name
- `avatar_url` (TEXT) - User's avatar
- `spirit_vector` (TEXT) - Combined 7-strings from grid
- `spirit_vector_embedding` (vector(1536)) - Embedding for spirit vector
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Functions

### `generate_seven_string(ref_title, caption)`
Generates a 7-string using OpenAI GPT-4o from ref title and user caption.

### `generate_embedding(text_content)`
Generates vector embedding using OpenAI text-embedding-3-small.

### `process_new_item(item_id, ref_id, item_text, ref_title)`
Complete pipeline for processing a new item:
1. Generate 7-string
2. Generate embedding
3. Store in database

### `regenerate_spirit_vector(user_id)`
Regenerates spirit vector for a user:
1. Collect 7-strings from top 12 grid items
2. Combine strings
3. Generate embedding
4. Update user record

## Search Ranking Logic

1. **Exact Matches**: Users with exact ref matches (highest priority)
2. **High Similarity**: Users with 7-string similarity > 0.7
3. **Similarity Score**: Users with closest embeddings
4. **Spirit Vector**: Tiebreaker using spirit vector similarity

## Error Handling

- OpenAI API failures fall back to simple text concatenation
- Embedding failures return zero vectors
- Database errors are logged and don't crash the system
- Retry logic should be implemented for critical operations

## Performance Considerations

- Embeddings are generated asynchronously
- Spirit vectors are regenerated only when grid changes
- Search uses pgvector's optimized similarity functions
- Results are cached where appropriate

## Testing

1. Create a test item in PocketBase
2. Verify 7-string generation in Supabase
3. Test search functionality
4. Verify spirit vector regeneration

## Monitoring

- Log all OpenAI API calls
- Monitor embedding generation times
- Track search performance
- Alert on failed operations 