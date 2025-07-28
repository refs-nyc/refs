#!/bin/bash

echo "🚀 Starting Refs People Finder services (Fixed Ports)..."

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "🔑 Environment variables loaded from .env"
else
    echo "❌ .env file not found. Please create one with your API keys."
    exit 1
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*search_api" 2>/dev/null || true
pkill -f "uvicorn.*search_api" 2>/dev/null || true
pkill -f "pocketbase" 2>/dev/null || true

# Wait a moment for processes to die
sleep 2

echo "📦 Starting PocketBase..."
./.pocketbase/pocketbase serve --dir=.pocketbase --hooksDir=hooks &
POCKETBASE_PID=$!

# Wait for PocketBase to start
sleep 3

echo "🤖 Starting search API on port 8001..."
python3 -m uvicorn search_api:app --host 0.0.0.0 --port 8001 &
SEARCH_API_PID=$!

# Wait for search API to start
sleep 3

# Test both services
echo "✅ Testing services..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Search API: http://localhost:8001"
else
    echo "❌ Search API failed to start"
fi

if curl -s http://localhost:8090/api/health > /dev/null; then
    echo "✅ PocketBase: http://localhost:8090"
else
    echo "❌ PocketBase failed to start"
fi

echo ""
echo "✅ Services started!"
echo "📦 PocketBase: http://localhost:8090"
echo "🔍 Search API: http://localhost:8001"
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $POCKETBASE_PID 2>/dev/null || true
    kill $SEARCH_API_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait 