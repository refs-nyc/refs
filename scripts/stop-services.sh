#!/bin/bash

echo "🛑 Stopping Refs services..."

# Stop PocketBase
echo "📦 Stopping PocketBase server..."
pkill -f "pocketbase serve"

# Stop webhook server
echo "📡 Stopping webhook server..."
pkill -f "webhook-sync.js"

# Stop matchmaking server (if running)
echo "🔌 Stopping matchmaking server..."
pkill -f "matchmaking-server"

echo "✅ All services stopped!" 