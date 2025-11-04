#!/bin/sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer the locally downloaded binary (Mac dev env) but fall back to the repo-supplied one (Linux/Railway).
if [ -x "${ROOT_DIR}/../.pocketbase/pocketbase" ]; then
  PB_BIN="${ROOT_DIR}/../.pocketbase/pocketbase"
else
  PB_BIN="${ROOT_DIR}/pocketbase"
fi

if [ ! -x "${PB_BIN}" ]; then
  echo "PocketBase binary not found or not executable at ${PB_BIN}" >&2
  exit 1
fi
DATA_DIR="${POCKETBASE_DATA_DIR:-${ROOT_DIR}/../.pocketbase/pb_data}"
HOOKS_DIR="${POCKETBASE_HOOKS_DIR:-${DATA_DIR}/pb_hooks}"
SEED_HOOKS_DIR="${ROOT_DIR}/pb_data/pb_hooks"

# Ensure the hooks directory in the mounted data volume exists.
mkdir -p "${HOOKS_DIR}"

# Copy the versioned hooks into the data volume before we boot PocketBase.
if [ -d "${SEED_HOOKS_DIR}" ]; then
  for hook_file in "${SEED_HOOKS_DIR}"/*.js "${SEED_HOOKS_DIR}"/*.pb.js; do
    [ -f "${hook_file}" ] || continue
    cp "${hook_file}" "${HOOKS_DIR}/"
  done
fi

echo "[start] using PocketBase binary: ${PB_BIN}"
echo "[start] data dir: ${DATA_DIR}"
echo "[start] hooks dir: ${HOOKS_DIR}"
echo "[start] hooks contents:"
ls -la "${HOOKS_DIR}" || echo "(hooks dir missing)"

exec "${PB_BIN}" serve \
  --dir "${DATA_DIR}" \
  --hooksDir "${HOOKS_DIR}" \
  --http "0.0.0.0:${PORT:-8080}"
