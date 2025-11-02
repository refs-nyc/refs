#!/bin/sh
# PocketBase startup script with hooks support
set -e

echo "🚀 Starting PocketBase with hooks..."

# Create hooks directory
mkdir -p /pb/pb_data/pb_hooks

# Copy hooks from repo if they exist
if [ -f /app/hooks/notifications.js ]; then
    echo "📦 Copying notifications.js hook..."
    cp /app/hooks/notifications.js /pb/pb_data/pb_hooks/notifications.js
    echo "✅ Hook copied"
fi

# List hooks directory
echo "📋 Hooks directory contents:"
ls -la /pb/pb_data/pb_hooks/ || echo "Hooks directory empty or not accessible"

# Start PocketBase with hooks directory
echo "🎯 Starting PocketBase server..."
exec /pb/pocketbase serve \
    --dir /pb/pb_data \
    --hooksDir /pb/pb_data/pb_hooks \
    --http 0.0.0.0:${PORT:-8080}

