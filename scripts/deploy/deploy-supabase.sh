#!/bin/bash

# Supabase Edge Function Deployment Script
# This script deploys the OpenAI Edge Function to Supabase with proper secrets management

set -e  # Exit on any error

echo "🚀 Starting Supabase Edge Function deployment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in the correct directory. Please run this from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one with your environment variables."
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$SUPA_URL" ] || [ -z "$SUPA_KEY" ]; then
    echo "❌ Missing required environment variables: SUPA_URL, SUPA_KEY"
    echo "   Please check your .env file"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Missing OPENAI_API_KEY in .env file"
    echo "   Please add your OpenAI API key to the .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Initialize Supabase if not already done
if [ ! -f "supabase/.gitignore" ]; then
    echo "📦 Initializing Supabase..."
    supabase init
fi

# Link to project (if not already linked)
echo "🔗 Linking to Supabase project..."
if ! supabase status &> /dev/null; then
    echo "   Please run: supabase link --project-ref YOUR_PROJECT_REF"
    echo "   You can find your project ref in the Supabase dashboard URL"
    exit 1
fi

# Apply database schema
echo "🗄️  Applying database schema..."
supabase db push

# Deploy the Edge Function
echo "🚀 Deploying Edge Function..."
supabase functions deploy openai

# Set secrets
echo "🔐 Setting secrets..."
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the function:"
echo "   curl -X POST $SUPA_URL/functions/v1/openai \\"
echo "     -H \"Authorization: Bearer $SUPA_KEY\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"action\": \"generate_seven_string\", \"ref_title\": \"Test\", \"caption\": \"Test\"}'"
echo ""
echo "2. Update your frontend to use the Edge Function client"
echo "3. Monitor function logs in the Supabase dashboard"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard" 