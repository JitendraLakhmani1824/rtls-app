#!/bin/bash
# The comparison ladder (design §2.10) on a USB-connected Android phone with the release build installed.
# Usage: scripts/ladder-android.sh <friends> [runs=3] [scenario=concert] [warmup=15] [window=5]
# RUNGS="D" (env) measures only those rungs; EXTRA="&fade=300" (env) is appended to every link —
# together, a before/after on one change.
# ABAB order (A B C D, then D C B A, …); each run is a cold start by deep link, measured after the warm-up.
# Per run: map-surface frames (SurfaceFlinger), app-UI frames (gfxinfo), and the PERF lines in the window.
# Prints one JSON row per run, then the median per rung.
set -euo pipefail
FRIENDS=${1:?friends}
RUNS=${2:-3}
SCENARIO=${3:-concert}
WARMUP=${4:-15}
WINDOW=${5:-5}
APP=com.rtls.casestudy
TMP=$(mktemp -d)
ROWS="$TMP/rows.jsonl"
DIR=$(cd "$(dirname "$0")" && pwd)
: > "$ROWS"

measure() { # rung run
  local rung=$1 run=$2 link="rtls://scenario?name=$SCENARIO&friends=$FRIENDS&seed=42&rung=$1&perf=1${EXTRA:-}"
  adb shell input keyevent KEYCODE_WAKEUP # keeps the screen on through a long ladder
  adb shell am force-stop "$APP"
  adb shell "am start -a android.intent.action.VIEW -d '$link'" >/dev/null
  sleep "$WARMUP"
  adb shell dumpsys gfxinfo "$APP" reset >/dev/null
  adb logcat -c
  python3 -I "$DIR/sf_frames.py" "$WINDOW" "$APP" > "$TMP/sf.json" # samples for $WINDOW seconds
  adb shell dumpsys gfxinfo "$APP" > "$TMP/gfx.txt"
  adb logcat -d -s ReactNativeJS:V | grep PERF | sed 's/.*PERF //' > "$TMP/perf.txt" || true
  local temp
  temp=$(adb shell dumpsys battery | awk '/temperature/ {print $2 / 10}')
  python3 -I - "$TMP" "$rung" "$run" "$WINDOW" "$temp" "${EXTRA:-}" >> "$ROWS" <<'PY'
import json, re, sys
d, rung, run, window, temp, extra = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
frames = json.load(open(f'{d}/sf.json'))
gfx = open(f'{d}/gfx.txt').read()
num = lambda pat: (lambda m: float(m.group(1)) if m else None)(re.search(pat, gfx))
perf = [json.loads(l) for l in open(f'{d}/perf.txt') if l.strip().startswith('{')]
keys = sorted({k for p in perf for k, v in p.items() if isinstance(v, (int, float))})
avg = {k: round(sum(p.get(k, 0) for p in perf) / len(perf), 3) for k in keys} if perf else {}
print(json.dumps({
  'rung': rung, 'run': run, 'extra': extra, 'tempC': temp, **frames,
  'uiFps': round((num(r'Total frames rendered: (\d+)') or 0) / window, 1),
  'uiJankyPct': num(r'Janky frames: \d+ \(([\d.]+)%\)'), 'uiP95': num(r'95th percentile: (\d+)ms'),
  'perf': avg,
}))
PY
  tail -1 "$ROWS"
}

read -r -a ORDER <<< "${RUNGS:-A B C D}"
REVERSED=()
for (( i=${#ORDER[@]}-1; i>=0; i-- )); do REVERSED+=("${ORDER[i]}"); done
for run in $(seq 1 "$RUNS"); do
  if (( run % 2 == 0 )); then rungs=("${REVERSED[@]}"); else rungs=("${ORDER[@]}"); fi
  for rung in "${rungs[@]}"; do measure "$rung" "$run"; done
done

echo "--- median of $RUNS runs, $FRIENDS friends, $SCENARIO"
python3 -I - "$ROWS" <<'PY'
import json, statistics, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
med = lambda xs: round(statistics.median(xs), 2) if xs else None
for rung in 'ABCD':
    rs = [r for r in rows if r['rung'] == rung]
    if not rs: continue
    pick = lambda k: med([r[k] for r in rs if r.get(k) is not None])
    perf = lambda k: med([r['perf'][k] for r in rs if k in r['perf']])
    print(json.dumps({'rung': rung, 'mapFps': pick('mapFps'), 'mapGapP95': pick('mapGapP95'),
        'mapStutterPct': pick('mapStutterPct'), 'uiFps': pick('uiFps'), 'uiJankyPct': pick('uiJankyPct'),
        'uiP95': pick('uiP95'), 'jsFps': perf('jsFps'), 'jsLagMs': perf('jsLagMs'), 'longTasks': perf('longTasks'),
        'gcs': perf('gcs'), 'tempC': pick('tempC'), 'encodeMs': perf('encodeMs'),
        'encodeStillMs': perf('encodeStillMs'), 'stillFrameMs': perf('stillFrameMs'),
        'visibilityMs': perf('visibilityMs'), 'ingestMs': perf('ingestMs')}))
PY
rm -rf "$TMP"
