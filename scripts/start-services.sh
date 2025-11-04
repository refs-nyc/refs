#!/bin/bash

echo "🚀 Starting Refs services..."

# Ensure PocketBase push notification env vars are available (mirrors start-pocketbase.sh)
ENV_FILE=".env.local"

export SUPABASE_NOTIFICATIONS_URL="${SUPABASE_NOTIFICATIONS_URL:-https://zrxgnplwnfaxtpffrqxo.supabase.co/functions/v1/notifications}"
export SUPABASE_NOTIFICATIONS_SECRET="${SUPABASE_NOTIFICATIONS_SECRET:-WWmbsd55!!27}"

if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    if [ -f "$ENV_FILE" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            case "$line" in
                ''|\#*)
                    continue
                    ;;
                EXPO_PUBLIC_SUPA_KEY=*)
                    export SUPABASE_ANON_KEY="${line#*=}"
                    break
                    ;;
            esac
        done < "$ENV_FILE"

        if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
            echo "[push] warning: EXPO_PUBLIC_SUPA_KEY not found in $ENV_FILE; Supabase anon key unavailable" >&2
        fi
    else
        echo "[push] warning: $ENV_FILE not found; Supabase anon key unavailable" >&2
    fi
fi

if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    echo "[push] warning: SUPABASE_ANON_KEY is not set; push notification calls will be unauthenticated" >&2
else
    echo "[push] SUPABASE_ANON_KEY configured for PocketBase notifications"
fi

POCKETBASE_DATA_DIR_VALUE="${POCKETBASE_DATA_DIR:-$(pwd)/.pocketbase/pb_data}"
POCKETBASE_PORT="${PORT:-8090}"

# Check if PocketBase is already running
if ! lsof -i :"$POCKETBASE_PORT" > /dev/null 2>&1; then
    echo "📦 Starting PocketBase server..."
    POCKETBASE_DATA_DIR="$POCKETBASE_DATA_DIR_VALUE" PORT="$POCKETBASE_PORT" ./pocketbase/start.sh &
    sleep 3
else
    echo "✅ PocketBase already running on port $POCKETBASE_PORT"
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
