#!/bin/bash
# Quick PocketBase Hooks Diagnostic Script
# Run this locally to test hooks step by step

set -e

echo "🔍 PocketBase Hooks Diagnostic"
echo "================================"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Test Step 1: Check if hooks_ping endpoint works
echo "📍 Step 1: Testing /hooks_ping endpoint..."
RESPONSE=$(curl -sS -w "\n%{http_code}" https://pocketbase-production-8501.up.railway.app/hooks_ping 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Hooks are loading! Response: $BODY"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check if your notifications.js is deployed:"
    echo "      railway ssh --service pocketbase"
    echo "      ls -la /pb/pb_data/pb_hooks/"
    echo "      cat /pb/pb_data/pb_hooks/notifications.js"
    echo ""
    echo "   2. Check environment variables:"
    echo "      railway variables --service pocketbase"
    echo ""
    echo "   3. Test by sending a message and watching logs:"
    echo "      railway logs --service pocketbase"
    exit 0
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Hooks NOT loading (404)"
    echo ""
    echo "📋 Next steps to fix:"
    echo "   1. Create probe hook to test:"
    echo "      railway ssh --service pocketbase"
    echo "      mkdir -p /pb/pb_data/pb_hooks"
    echo "      cat > /pb/pb_data/pb_hooks/00_probe.js <<'EOF'"
    echo "routerAdd('GET', '/hooks_ping', (c) => c.json({ ok: true }))"
    echo "onRecordAfterCreateRequest((e) => {"
    echo "  try { console.log('[probe] afterCreate', e.collection?.name || 'unknown', e.record?.id || null) } catch {}"
    echo "})"
    echo "EOF"
    echo "      exit"
    echo ""
    echo "   2. Check PocketBase start command:"
    echo "      Should include: --hooksDir /pb/pb_data/pb_hooks"
    echo ""
    echo "   3. Redeploy:"
    echo "      railway redeploy --service pocketbase --yes"
    echo ""
    echo "   4. Run this script again to verify"
    exit 1
else
    echo "⚠️  Unexpected response (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
    echo ""
    echo "   Check if PocketBase is running:"
    echo "   railway logs --service pocketbase"
    exit 1
fi

