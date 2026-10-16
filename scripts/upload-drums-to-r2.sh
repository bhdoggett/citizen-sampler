#!/usr/bin/env bash
# Downloads the drum kit MP3s listed in frontend-next/src/lib/drumMachines.ts
# from the Library of Congress citizen-dj repo and uploads them to R2.
#
# Usage: scripts/upload-drums-to-r2.sh <bucket-name>
# Requires: `npx wrangler login` first.
set -euo pipefail

BUCKET="${1:?usage: $0 <bucket-name>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="https://raw.githubusercontent.com/LibraryOfCongress/citizen-dj/master/audio/drum_machines"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

grep -oE '"[^"]+\.mp3"' "$ROOT/frontend-next/src/lib/drumMachines.ts" | tr -d '"' | sort -u > "$WORK/files.txt"
echo "Downloading $(wc -l < "$WORK/files.txt" | tr -d ' ') files..."
mkdir -p "$WORK/drums"
while read -r f; do
  curl -sfL -o "$WORK/drums/$f" "$SOURCE/$f" || { echo "Download failed: $f" >&2; exit 1; }
done < "$WORK/files.txt"

cat > "$WORK/cors.json" <<'JSON'
{
  "rules": [
    {
      "allowed": { "origins": ["*"], "methods": ["GET", "HEAD"] },
      "maxAgeSeconds": 86400
    }
  ]
}
JSON
npx wrangler r2 bucket cors set "$BUCKET" --file "$WORK/cors.json" --force

echo "Uploading..."
while read -r f; do
  npx wrangler r2 object put "$BUCKET/drums/$f" --remote \
    --file "$WORK/drums/$f" \
    --content-type audio/mpeg \
    --cache-control "public, max-age=31536000, immutable" >/dev/null
  echo "  $f"
done < "$WORK/files.txt"
echo "Done."
