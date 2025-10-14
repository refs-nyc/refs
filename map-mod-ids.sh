#!/usr/bin/env bash
set -euo pipefail

METRO_HOST="${METRO_HOST:-127.0.0.1}"
METRO_PORT="${METRO_PORT:-8081}"
PLATFORM="${PLATFORM:-ios}"
DEV="${DEV:-true}"
MINIFY="${MINIFY:-false}"

if [ $# -eq 0 ]; then
  echo "Usage: METRO_HOST=127.0.0.1 METRO_PORT=8081 bash $0 <moduleId> [<moduleId> ...]" >&2
  exit 1
fi

ids=("$@")

# Compute distinct segment ids from the "big" ids
segments=""
for bid in "${ids[@]}"; do
  seg=$(( (bid >> 16) & 0xFFFF ))
  case " $segments " in
    *" $seg "*) ;;
    *) segments="$segments $seg" ;;
  esac
done

segments="${segments# }"

tmpdir="$(mktemp -d)"
echo "[info] tmpdir: $tmpdir"

# Fetch each segment bundle once
for seg in $segments; do
  if [ "$seg" -eq 0 ]; then
    url="http://${METRO_HOST}:${METRO_PORT}/node_modules/expo-router/entry.bundle?platform=${PLATFORM}&dev=${DEV}&minify=${MINIFY}&transform.routerRoot=app"
    out="$tmpdir/seg-0.bundle"
  else
    url="http://${METRO_HOST}:${METRO_PORT}/node_modules/expo-router/entry.bundle?platform=${PLATFORM}&dev=${DEV}&minify=${MINIFY}&transform.routerRoot=app&segmentId=${seg}"
    out="$tmpdir/seg-${seg}.bundle"
  fi
  echo "[fetch] $url"
  curl -fsS "$url" -o "$out" || { echo "[warn] failed to fetch seg-$seg (maybe no such segment)"; }
done

# Node parser: scan for __d(factory, localId, deps, "verboseName")
node - <<'NODE' "$tmpdir" "${ids[@]}"
const fs = require('fs');
const path = require('path');

const tmp = process.argv[2];
const targets = process.argv.slice(3).map(n => Number(n));

function parseBundle(file) {
  if (!fs.existsSync(file)) return new Map();
  const code = fs.readFileSync(file, 'utf8');

  // Metro dev (unminified) commonly emits: __d(factory, <id>, [deps], "path")
  const reA = /__d\(\s*[^,]+,\s*(\d+)\s*,\s*\[[^\]]*\]\s*,\s*"([^"]+)"\s*\)/g;

  // Some variants: __d(factory, <id>, [deps]) then later __d( ..., ..., ..., {name:"path"}) – try to catch those too
  const reB = /__d\(\s*[^,]+,\s*(\d+)\s*,\s*\[[^\]]*\]\s*,\s*\{[^}]*?(?:name|verboseName)"\s*:\s*"([^"]+)"[^}]*\}\s*\)/g;

  const map = new Map();
  let m;
  while ((m = reA.exec(code))) map.set(Number(m[1]), m[2]);
  while ((m = reB.exec(code))) if (!map.has(Number(m[1]))) map.set(Number(m[1]), m[2]);
  return map;
}

function segFile(seg) { return path.join(tmp, `seg-${seg}.bundle`); }

function bigToSegLocal(big) {
  const seg = (big >>> 16) & 0xFFFF;
  const local = big & 0xFFFF;
  return { seg, local };
}

const cache = new Map(); // seg -> map(localId -> name)

function getNameFor(bigId) {
  const { seg, local } = bigToSegLocal(bigId);
  if (!cache.has(seg)) cache.set(seg, parseBundle(segFile(seg)));
  const m = cache.get(seg);
  return { seg, local, name: m.get(local) || null };
}

for (const id of targets) {
  const { seg, local, name } = getNameFor(id);
  console.log(`${id}\tsegment=${seg}\tlocal=${local}\t${name || 'NOT-FOUND'}`);
}
NODE
