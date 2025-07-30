# Production Deployment Guide

This guide covers deploying the Supabase Edge Functions to production with secure secrets management.

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Supabase project created**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

3. **OpenAI API key**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## Deployment Steps

### 1. Initialize Supabase (if not already done)
```bash
supabase init
```

### 2. Link to your Supabase project
```bash
supabase link --project-ref your-project-ref
```

### 3. Set up the database schema
```bash
# Apply the schema to your Supabase project
supabase db push
```

### 4. Deploy the Edge Function
```bash
supabase functions deploy openai
```

### 5. Set secrets securely

You have three options for setting secrets:

#### Option A: Using Supabase CLI
```bash
supabase secrets set OPENAI_API_KEY=your-actual-openai-api-key
```

#### Option B: Using .env file
1. Create `supabase/functions/.env`:
   ```
   OPENAI_API_KEY=your-actual-openai-api-key
   ```
2. Push secrets:
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   ```

#### Option C: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Find the "openai" function
4. Go to the "Secrets" section
5. Add `OPENAI_API_KEY` with your actual API key

### 6. Test the deployment

```bash
# Test the function locally
supabase functions serve openai

# Or test the deployed function
curl -X POST https://your-project-ref.supabase.co/functions/v1/openai \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_seven_string",
    "ref_title": "Test Ref",
    "caption": "Test Caption"
  }'
```

## Environment Variables

The Edge Function expects these environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `SUPABASE_URL`: Your Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (auto-provided)

## Function Endpoints

The Edge Function supports these actions:

### Generate 7-string
```json
{
  "action": "generate_seven_string",
  "ref_title": "Ref Title",
  "caption": "User Caption"
}
```

### Generate Embedding
```json
{
  "action": "generate_embedding",
  "text": "Text to embed"
}
```

### Process Item
```json
{
  "action": "process_item",
  "item_id": "item-id",
  "ref_id": "ref-id",
  "creator": "user-id",
  "item_text": "User caption",
  "ref_title": "Ref title"
}
```

### Regenerate Spirit Vector
```json
{
  "action": "regenerate_spirit_vector",
  "user_id": "user-id"
}
```

## Security Notes

1. **Never commit API keys** to version control
2. **Use environment secrets** for all sensitive data
3. **Service role key** has full database access - keep it secure
4. **CORS is configured** to allow requests from your frontend

## Troubleshooting

### Function not found
- Ensure you've deployed the function: `supabase functions deploy openai`
- Check the function name matches exactly

### API key errors
- Verify the secret is set: `supabase secrets list`
- Check the secret name is exactly `OPENAI_API_KEY`

### Database errors
- Ensure the schema is applied: `supabase db push`
- Check your service role key has proper permissions

## Next Steps

After deployment:

1. Update your frontend to call the Edge Function instead of local functions
2. Test the complete flow from item creation to search
3. Monitor function logs in the Supabase dashboard
4. Set up proper error handling and retry logic 