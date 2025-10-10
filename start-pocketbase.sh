#!/usr/bin/env bash
# Launch PocketBase with push-notification env vars

export SUPABASE_NOTIFICATIONS_URL="https://zrxgnplwnfaxtpffrqxo.supabase.co/functions/v1/notifications"
export SUPABASE_NOTIFICATIONS_SECRET="9b5f28e47ac103d2f4618ce0b79a52e6"

# Automatically load the Supabase anon key from env.local if SUPABASE_ANON_KEY is not already set
if [ -z "$SUPABASE_ANON_KEY" ]; then
  if [ -f env.local ]; then
    SUPABASE_ANON_KEY=$(grep -E '^EXPO_PUBLIC_SUPA_KEY=' env.local | cut -d'=' -f2-)
    export SUPABASE_ANON_KEY
  fi
fi

./.pocketbase/pocketbase serve
