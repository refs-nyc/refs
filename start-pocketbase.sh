#!/usr/bin/env bash
set -euo pipefail
# Launch PocketBase with push-notification env vars

ENV_FILE=".env.local"

export SUPABASE_NOTIFICATIONS_URL="https://zrxgnplwnfaxtpffrqxo.supabase.co/functions/v1/notifications"
export SUPABASE_NOTIFICATIONS_SECRET="WWmbsd55!!27"

# Automatically load the Supabase anon key from .env.local if SUPABASE_ANON_KEY is not already set
if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  if [ -f "$ENV_FILE" ]; then
    supabase_anon_from_file=""
    while IFS= read -r line || [ -n "$line" ]; do
      # Ignore comments/empty lines
      case "$line" in
        ''|\#*)
          continue
          ;;
        EXPO_PUBLIC_SUPA_KEY=*)
          supabase_anon_from_file="${line#*=}"
          break
          ;;
      esac
    done < "$ENV_FILE"

    if [ -n "$supabase_anon_from_file" ]; then
      export SUPABASE_ANON_KEY="$supabase_anon_from_file"
    else
      echo "[push] warning: EXPO_PUBLIC_SUPA_KEY not found in $ENV_FILE; Supabase anon key unavailable" >&2
    fi
  else
    echo "[push] warning: $ENV_FILE not found; Supabase anon key unavailable" >&2
  fi
fi

if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "[push] warning: SUPABASE_ANON_KEY is not set; push notification calls will be unauthenticated" >&2
else
  echo "[push] SUPABASE_ANON_KEY loaded for PocketBase notifications"
fi

./.pocketbase/pocketbase serve
