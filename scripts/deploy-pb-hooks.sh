#!/bin/bash
# Deploy hooks to PocketBase on Railway
# This script copies your local hooks to the PocketBase container

set -e

echo "🚀 Deploying PocketBase Hooks"
echo "=============================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Check if hooks/notifications.pb.js exists
if [ ! -f "hooks/notifications.pb.js" ]; then
    echo "❌ hooks/notifications.pb.js not found"
    echo "   Make sure you're running this from the project root"
    exit 1
fi

echo "📦 Found hooks/notifications.pb.js"
echo ""

# Create a temporary script to deploy hooks
cat > /tmp/deploy-hooks.sh <<'EOF'
#!/bin/sh
set -e

echo "Creating hooks directory..."
mkdir -p /pb/pb_data/pb_hooks

echo "Deploying notifications.pb.js..."
cat > /pb/pb_data/pb_hooks/notifications.pb.js <<'HOOKEOF'
EOF

# Append the actual hooks content
cat hooks/notifications.pb.js >> /tmp/deploy-hooks.sh

# Close the heredoc
cat >> /tmp/deploy-hooks.sh <<'EOF'
HOOKEOF

echo "Setting permissions..."
chmod 644 /pb/pb_data/pb_hooks/notifications.pb.js

echo "✅ Hooks deployed!"
echo ""
echo "Listing hooks directory:"
ls -la /pb/pb_data/pb_hooks/

echo ""
echo "📋 Hooks content preview (first 10 lines):"
head -n 10 /pb/pb_data/pb_hooks/notifications.pb.js
EOF

echo "📤 Uploading deployment script to PocketBase..."
railway run --service pocketbase sh < /tmp/deploy-hooks.sh

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify the hooks are loaded by checking for probe endpoint:"
echo "      curl https://pocketbase-production-8501.up.railway.app/hooks_ping"
echo ""
echo "   2. If 404, you need to update the PocketBase start command to:"
echo "      /pb/pocketbase serve --dir /pb/pb_data --hooksDir /pb/pb_data/pb_hooks --http 0.0.0.0:8080"
echo ""
echo "   3. After updating start command, redeploy:"
echo "      railway redeploy --service pocketbase --yes"
echo ""
echo "   4. Watch logs to see hooks in action:"
echo "      railway logs --service pocketbase"

# Clean up
rm /tmp/deploy-hooks.sh
