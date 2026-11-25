#!/bin/bash
# Real map frames on a USB-connected Android phone, read from the compositor (SurfaceFlinger) for MapLibre's SurfaceView.
# Usage: scripts/map-frames-android.sh <label> [seconds=3]
# Prints map frames/s, frame-gap p50/p95 (active frames) and max, stutter % (active gaps > 25 ms),
# idle gaps (> 100 ms: nothing to draw), then the last two PERF lines from the app.
# Sampled in 1-second chunks: SurfaceFlinger keeps only the last 127 frames (see scripts/sf_frames.py).
set -euo pipefail
LABEL=${1:-run}
SECS=${2:-3}
DIR=$(cd "$(dirname "$0")" && pwd)
echo "$LABEL: $(python3 -I "$DIR/sf_frames.py" "$SECS")"
adb logcat -d -s ReactNativeJS:V | grep PERF | tail -2 | sed 's/.*PERF //'
