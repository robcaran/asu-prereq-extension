#!/usr/bin/env bash
# Build a zip for Chrome Web Store upload (runtime files only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/asu-prereq-helper.zip"
rm -f "${OUT}"
cd "${ROOT}"

zip -r "${OUT}" \
  manifest.json \
  background.js \
  content.js \
  options.html \
  options.js \
  icons/icon16.png \
  icons/icon32.png \
  icons/icon48.png \
  icons/icon128.png

echo ""
echo "Packaged: ${OUT}"
unzip -l "${OUT}"
