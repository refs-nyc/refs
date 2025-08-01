#!/bin/bash

echo "🚀 Starting Refs services..."

# Check if PocketBase is already running
if ! lsof -i :8090 > /dev/null 2>&1; then
    echo "📦 Starting PocketBase server..."
    ./.pocketbase/pocketbase serve &
    sleep 3
else
    echo "✅ PocketBase already running on port 8090"
fi

# Check if webhook server is already running
if ! lsof -i :3002 > /dev/null 2>&1; then
    echo "📡 Starting webhook server..."
    node scripts/webhook-sync.js &
    sleep 2
else
    echo "✅ Webhook server already running on port 3002"
fi

echo "🎉 All services started!"
echo ""
echo "📊 Service Status:"
echo "   - PocketBase: http://127.0.0.1:8090"
echo "   - Webhook Server: http://localhost:3002"
echo ""
echo "💡 To stop all services, run: ./scripts/stop-services.sh" 