#!/bin/sh
set -e

# Railway runs this from the repo root
# Binary: ./pocketbase/pocketbase
# Hooks: ./pocketbase/pb_data/pb_hooks/
# Data: /pb/pb_data (volume)

exec ./pocketbase/pocketbase serve \
  --dir /pb/pb_data \
  --hooksDir ./pocketbase/pb_data/pb_hooks \
  --http 0.0.0.0:${PORT:-8080}
