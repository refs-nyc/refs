#!/bin/sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PB_BIN="${ROOT_DIR}/pocketbase"
DATA_DIR="${POCKETBASE_DATA_DIR:-/pb/pb_data}"
HOOKS_DIR="${POCKETBASE_HOOKS_DIR:-${DATA_DIR}/pb_hooks}"
SEED_HOOKS_DIR="${ROOT_DIR}/pb_data/pb_hooks"

# Ensure the hooks directory in the mounted data volume exists.
mkdir -p "${HOOKS_DIR}"

# Copy the versioned hooks into the data volume before we boot PocketBase.
if [ -d "${SEED_HOOKS_DIR}" ]; then
  for hook_file in "${SEED_HOOKS_DIR}"/*.js; do
    [ -f "${hook_file}" ] || continue
    cp "${hook_file}" "${HOOKS_DIR}/"
  done
fi

exec "${PB_BIN}" serve \
  --dir "${DATA_DIR}" \
  --hooksDir "${HOOKS_DIR}" \
  --http "0.0.0.0:${PORT:-8080}"
