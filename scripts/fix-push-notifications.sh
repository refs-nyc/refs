#!/bin/bash
# Complete Push Notifications Fix Script
# This will commit the changes and guide you through Railway setup

set -e

echo "🔧 Push Notifications Fix Script"
echo "================================="
echo ""

cd "$(dirname "$0")/.."

echo "📦 Changes I've made for you:"
echo "  ✅ Added /hooks_ping test endpoint to notifications.js"
echo "  ✅ Created start-pocketbase-with-hooks.sh startup script"
echo "  ✅ Created Railway configuration files"
echo "  ✅ Created diagnostic and deployment scripts"
echo ""

# Check if there are changes to commit
if [[ -n $(git status -s) ]]; then
    echo "📝 Committing changes to git..."
    git add hooks/notifications.js
    git add start-pocketbase-with-hooks.sh
    git add railway.json 2>/dev/null || true
    git add scripts/
    git add RAILWAY-SETUP-GUIDE.md
    
    git commit -m "Fix: Add PocketBase hooks support for push notifications

- Add /hooks_ping endpoint to verify hooks loading
- Create startup script with --hooksDir flag
- Add Railway configuration
- Add setup documentation and scripts"
    
    echo "✅ Changes committed!"
    echo ""
else
    echo "ℹ️  No changes to commit (already committed)"
    echo ""
fi

echo "📤 Pushing to git..."
git push origin $(git branch --show-current)
echo "✅ Pushed!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS - Railway Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1: EASIEST METHOD (if Railway picks up the config automatically)"
echo "  1. Go to Railway Dashboard → Your Project → pocketbase service"
echo "  2. Wait for auto-deploy to complete"
echo "  3. Run: curl https://pocketbase-production-8501.up.railway.app/hooks_ping"
echo "  4. If you see {\"ok\":true}, you're done! 🎉"
echo ""
echo "Option 2: Manual Setup (if auto-deploy doesn't work)"
echo "  1. Go to Railway Dashboard → pocketbase service → Settings"
echo "  2. Find 'Start Command' and set it to:"
echo "     /pb/pocketbase serve --dir /pb/pb_data --hooksDir /pb/pb_data/pb_hooks --http 0.0.0.0:\${PORT:-8080}"
echo "  3. Click Redeploy"
echo "  4. Test: curl https://pocketbase-production-8501.up.railway.app/hooks_ping"
echo ""
echo "📖 For detailed instructions, see: RAILWAY-SETUP-GUIDE.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Testing if hooks are loaded..."
sleep 2

RESPONSE=$(curl -sS https://pocketbase-production-8501.up.railway.app/hooks_ping 2>/dev/null || echo "")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "🎉 SUCCESS! Hooks are already working!"
    echo "   Response: $RESPONSE"
    echo ""
    echo "   Push notifications should now work!"
    echo "   Test by sending a message in your app."
else
    echo "⏳ Hooks not loaded yet."
    echo "   Response: $RESPONSE"
    echo ""
    echo "   This is expected if Railway hasn't redeployed yet."
    echo "   Follow the steps above to configure Railway."
fi

echo ""
echo "💡 To watch logs: railway logs --service pocketbase"
echo ""

