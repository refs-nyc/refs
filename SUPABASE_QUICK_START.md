# Supabase Edge Functions Quick Start

This guide will help you deploy the OpenAI Edge Function to Supabase for production use.

## Prerequisites

1. **Supabase Account**: Create one at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install with `npm install -g supabase`
3. **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `refs-matchmaking` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for setup to complete (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPA_URL=https://your-project-ref.supabase.co
SUPA_KEY=your-anon-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
```

## Step 4: Link and Deploy

1. **Link to your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Replace `your-project-ref` with your actual project ref from the URL)

2. **Run the deployment script**:
   ```bash
   ./deploy-supabase.sh
   ```

   This will:
   - Apply the database schema
   - Deploy the Edge Function
   - Set the OpenAI API key as a secret

## Step 5: Test the Deployment

Test the function with curl:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/openai \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_seven_string",
    "ref_title": "Test Ref",
    "caption": "Test Caption"
  }'
```

You should get a response like:
```json
{
  "seven_string": "Constraint-fiction devotee | Desaturated desert minimalism | Sketches street portraits | Ask about Oulipo | Rules as creative fuel | Thrives in micro-salons | Loves playful debate"
}
```

## Step 6: Update Your Application

Replace your local OpenAI calls with the Edge Function client:

```typescript
import { edgeFunctionClient } from './features/supabase/edge-function-client'

// Instead of calling OpenAI directly, use:
const result = await edgeFunctionClient.generateSevenString({
  ref_title: "Your Ref Title",
  caption: "User Caption"
})
```

## Troubleshooting

### Function not found
- Ensure you ran `supabase functions deploy openai`
- Check the function name is exactly "openai"

### API key errors
- Verify the secret is set: `supabase secrets list`
- Check the secret name is exactly `OPENAI_API_KEY`

### Database errors
- Ensure schema is applied: `supabase db push`
- Check your service role key has proper permissions

### CORS errors
- The function is configured to allow all origins
- If you need to restrict, modify the CORS headers in the function

## Security Notes

✅ **Secure**: API keys are stored as environment secrets  
✅ **Isolated**: Each function has its own runtime  
✅ **Monitored**: Logs available in Supabase dashboard  
✅ **Scalable**: Automatically scales with demand  

## Next Steps

1. **Monitor Usage**: Check function logs in Supabase dashboard
2. **Set Up Alerts**: Configure notifications for errors
3. **Optimize**: Monitor performance and adjust as needed
4. **Backup**: Set up database backups in Supabase dashboard

## Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard) 