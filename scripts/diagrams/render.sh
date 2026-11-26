#!/bin/bash
# Renders docs/media/rtls-hld.png and rtls-lld.png from the generators here (needs Google Chrome).
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$DIR/../../docs/media" && pwd)
TMP=$(mktemp -d)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 "$DIR/hld.py" "$DIR" "$TMP/hld.html"
python3 "$DIR/lld.py" "$DIR" "$TMP/lld.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1880,1330 --screenshot="$OUT/rtls-hld.png" "file://$TMP/hld.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1880,1270 --screenshot="$OUT/rtls-lld.png" "file://$TMP/lld.html"
rm -rf "$TMP"
