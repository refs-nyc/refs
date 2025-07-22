#!/bin/bash

echo "🚀 Starting Refs People Finder services (Working Configuration)..."

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded from .env"
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "🔑 Environment variables loaded"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*search_api" 2>/dev/null || true
pkill -f "uvicorn.*search_api" 2>/dev/null || true
pkill -f "pocketbase" 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Start PocketBase
echo "📦 Starting PocketBase..."
./.pocketbase/pocketbase serve --dir=.pocketbase --hooksDir=hooks &
POCKETBASE_PID=$!

# Wait for PocketBase to start
sleep 3

# Check if PocketBase is running
if curl -s http://localhost:8090/api/health > /dev/null; then
    echo "✅ PocketBase started successfully"
else
    echo "❌ PocketBase failed to start"
    exit 1
fi

# Start search API on port 8001 (avoiding the stuck port 8000)
echo "🤖 Starting search API on port 8001..."
python3 -m uvicorn search_api:app --host 0.0.0.0 --port 8001 &
SEARCH_API_PID=$!

# Wait for search API to start
sleep 3

# Check if search API is running
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Search API started successfully"
else
    echo "❌ Search API failed to start"
    kill $POCKETBASE_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 Services started successfully!"
echo "📦 PocketBase: http://localhost:8090"
echo "🔍 Search API: http://localhost:8001"
echo ""
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