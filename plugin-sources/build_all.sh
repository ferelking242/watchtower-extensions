#!/usr/bin/env bash
# Build every music plugin from `plugin-sources/` into `plugins/<slug>.smplug`.
#
# The compiler version is pinned: `hetu_script_dev_tools 0.1.0+2` emits the only
# bytecode format the `hetu_script 0.4.2` runtime bundled in Watchtower can load.
# A newer compiler produces bytecode that fails with LOAD_FAIL.
#
#   dart pub global activate hetu_script_dev_tools 0.1.0+2
#   ./plugin-sources/build_all.sh            # all plugins
#   ./plugin-sources/build_all.sh spotify    # one plugin
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/plugin-sources"
OUT="$ROOT/plugins"
HETU_DEV_TOOLS_VERSION="0.1.0+2"

# source directory → published slug
PLUGINS=(
  "applemusic:applemusic"
  "dab-music:dabmusic"
  "deezer:deezer"
  "flac:flac"
  "jiosaavn-audio:jiosaavn"
  "musicbrainz:musicbrainz"
  "spotify:spotify"
  "youtube-audio:youtubeaudio"
  "youtubemusic:youtubemusic"
)

FILTER="${1:-}"

if ! command -v hetu >/dev/null; then
  echo "hetu compiler not found. Install:" >&2
  echo "  dart pub global activate hetu_script_dev_tools $HETU_DEV_TOOLS_VERSION" >&2
  exit 1
fi

mkdir -p "$OUT"
FAILED=0

for pair in "${PLUGINS[@]}"; do
  dir="${pair%%:*}"
  slug="${pair##*:}"
  [ -n "$FILTER" ] && [[ "$dir" != *"$FILTER"* ]] && continue

  work="$SRC/$dir"
  build="$work/build"
  rm -rf "$build"
  mkdir -p "$build/archive"

  printf '%-16s ' "$dir"
  if ! (cd "$work" && hetu compile src/plugin.ht build/plugin.out >build/compile.log 2>&1); then
    echo "FAIL (compile)"
    head -6 "$work/build/compile.log" | sed 's/^/  /'
    FAILED=$((FAILED + 1))
    continue
  fi

  # The loader resolves plugin.json#entryPoint by name inside the bytecode.
  entry="$(python3 -c "import json,sys;print(json.load(open('$work/plugin.json'))['entryPoint'])")"
  if ! grep -q "$entry" "$build/plugin.out"; then
    echo "FAIL (entryPoint '$entry' absent from bytecode)"
    FAILED=$((FAILED + 1))
    continue
  fi

  cp "$work/plugin.json" "$build/archive/"
  cp "$build/plugin.out" "$build/archive/"
  for logo in "$work/assets/logo.png" "$work/logo.png"; do
    [ -f "$logo" ] && cp "$logo" "$build/archive/" && break
  done

  python3 - "$build/archive" "$OUT/$slug.smplug" <<'PY'
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
    for name in sorted(os.listdir(src)):
        z.write(os.path.join(src, name), name)
PY

  echo "OK  $OUT/$slug.smplug ($(wc -c < "$OUT/$slug.smplug") bytes)"
done

[ "$FAILED" -eq 0 ] || { echo "$FAILED plugin(s) failed" >&2; exit 1; }
