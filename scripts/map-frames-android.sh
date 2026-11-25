#!/bin/bash
# Real map frames on a USB-connected Android phone, read from the compositor (SurfaceFlinger) for MapLibre's SurfaceView.
# Usage: scripts/map-frames-android.sh <label> [seconds=3]
# Prints map frames/s and frame-gap p50/p95/max, then the last two PERF lines from the app.
set -euo pipefail
LABEL=${1:-run}
SECS=${2:-3}
OUT=$(mktemp)
LAYER=$(adb shell dumpsys SurfaceFlinger --list | grep -oE 'SurfaceView\[com\.rtls\.casestudy/[^]]*\]\(BLAST\)#[0-9]+' | head -1)
if [ -z "$LAYER" ]; then echo "Map surface not found — is the app open on the phone?"; exit 1; fi
adb shell "dumpsys SurfaceFlinger --latency-clear '$LAYER'" >/dev/null
sleep "$SECS"
adb shell "dumpsys SurfaceFlinger --latency '$LAYER'" > "$OUT"
python3 -I - "$OUT" "$SECS" "$LABEL" <<'PY'
import sys
lines = open(sys.argv[1]).read().split('\n')
secs, label = float(sys.argv[2]), sys.argv[3]
ts = sorted(int(p[1]) for p in (l.split() for l in lines[1:]) if len(p) == 3 and 0 < int(p[1]) < 9e18)
if len(ts) < 2:
    sys.exit(f'{label}: no map frames')
win = [t for t in ts if t >= ts[-1] - secs * 1e9]
gaps = sorted((b - a) / 1e6 for a, b in zip(win, win[1:]))
pct = lambda q: gaps[min(len(gaps) - 1, int(q * len(gaps)))]
print(f'{label}: map frames {len(win) / secs:.1f}/s · gap p50 {pct(.5):.1f} ms · p95 {pct(.95):.1f} ms · max {gaps[-1]:.1f} ms')
PY
adb logcat -d -s ReactNativeJS:V | grep PERF | tail -2 | sed 's/.*PERF //'
rm -f "$OUT"
