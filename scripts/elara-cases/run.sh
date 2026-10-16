#!/bin/bash
# Re-runs every Elara translation case on a clone of the URITP playground, then rebuilds the report:
# sandboxes/ELARA_TRANSLATION_CASES.md, the request-* programs, and md to pdf/ELARA_TRANSLATION_CASES.pdf.
# usage: scripts/elara-cases/run.sh PATH_TO_PLAYGROUND_CLONE   (github.com/senthuran2107/URITP)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../.." && pwd); CLONE=$(cd "$1" && pwd)
WORK=$(mktemp -d); mkdir -p "$WORK/play"; cd "$WORK"
cp "$HERE"/*.mjs .
node prepare.mjs "$CLONE"
python3 -I "$HERE/run_sources.py" "$CLONE" "$WORK/play" runs-in.json runs-out.json
node judge.mjs "$CLONE"
node publish.mjs "$REPO" "$WORK/report.html" "$(git -C "$CLONE" rev-parse --short HEAD)"
mkdir -p "$REPO/md to pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --no-pdf-header-footer --no-first-run --user-data-dir="$WORK/chrome" \
  --print-to-pdf="$REPO/md to pdf/ELARA_TRANSLATION_CASES.pdf" "file://$WORK/report.html" 2>/dev/null
echo "PDF: $REPO/md to pdf/ELARA_TRANSLATION_CASES.pdf"
