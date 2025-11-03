#!/bin/sh
set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Start PocketBase with hooks support
exec ./pocketbase/pocketbase serve \
  --dir /pb/pb_data \
  --hooksDir ./pocketbase/pb_data/pb_hooks \
  --http 0.0.0.0:${PORT:-8080}

