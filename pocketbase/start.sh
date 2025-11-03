#!/bin/sh
set -e

cd /workspace

# Start PocketBase with hooks support
exec ./pocketbase/pocketbase serve \
  --dir /pb/pb_data \
  --hooksDir ./pocketbase/pb_data/pb_hooks \
  --http 0.0.0.0:${PORT:-8080}

