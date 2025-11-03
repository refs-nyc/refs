#!/bin/sh
set -e

# Start PocketBase with hooks support
exec ./pocketbase/pocketbase serve \
  --dir ./pocketbase/pb_data \
  --hooksDir ./pocketbase/pb_data/pb_hooks \
  --http 0.0.0.0:${PORT:-8080}

