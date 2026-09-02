#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/build.mjs
node scripts/validate.mjs

VERSION="$(node -p "require('./komari-theme.json').version")"
OUTPUT="release/komari-butterfly-v${VERSION}.zip"
ABS_OUTPUT="$ROOT/$OUTPUT"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p release "$STAGE/dist"
rm -f "$OUTPUT" "$OUTPUT.sha256"
cp komari-theme.json preview.png "$STAGE/"
cp -a dist/. "$STAGE/dist/"

# Normalize archive timestamps and entry order so identical source files always
# produce the same release checksum on local machines and GitHub Actions.
find "$STAGE" -exec touch -h -t 198001010000.00 {} +
(
  cd "$STAGE"
  {
    printf '%s\n' komari-theme.json preview.png
    find dist -type f -print | LC_ALL=C sort
  } | TZ=UTC zip -X -q "$ABS_OUTPUT" -@
)

OUTPUT_NAME="$(basename "$OUTPUT")"
(
  cd release
  sha256sum "$OUTPUT_NAME" > "$OUTPUT_NAME.sha256"
)
HASH="$(cut -d ' ' -f 1 "$OUTPUT.sha256")"
node scripts/sync-release-metadata.mjs "$HASH"

printf 'Created %s\n' "$OUTPUT"
printf 'SHA256: %s\n' "$HASH"
