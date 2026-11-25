"""Map-surface frames on a USB-connected Android phone, from the compositor (SurfaceFlinger).

Usage: python3 -I scripts/sf_frames.py <seconds> [package=com.rtls.casestudy]
Prints one JSON line: frames/s, frame-gap p50/p95 over active gaps, max gap, stutter % and idle gaps.

`dumpsys SurfaceFlinger --latency` keeps only the last 127 frames (~2 s at 60 Hz), so the window is
sampled in 1-second chunks, each timed on the host. Gaps over 100 ms are idle (MapLibre draws on
demand), not stutter: percentiles and stutter (gaps > 25 ms) use the active gaps only.
"""

import json
import re
import subprocess
import sys
import time

CHUNK_S = 1.0
IDLE_MS = 100
STUTTER_MS = 25


def adb(*args: str) -> str:
    return subprocess.run(['adb', 'shell', *args], capture_output=True, text=True, check=True).stdout


def main() -> None:
    seconds = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    package = sys.argv[2] if len(sys.argv) > 2 else 'com.rtls.casestudy'
    found = re.findall(r'SurfaceView\[' + re.escape(package) + r'/[^\]]*\]\(BLAST\)#\d+', adb('dumpsys', 'SurfaceFlinger', '--list'))
    if not found:
        sys.exit('Map surface not found: is the app open on the phone?')
    layer = found[0]
    frames, span_s, gaps = 0, 0.0, []
    for _ in range(seconds):
        adb(f"dumpsys SurfaceFlinger --latency-clear '{layer}'")
        start = time.monotonic()
        time.sleep(CHUNK_S)
        out = adb(f"dumpsys SurfaceFlinger --latency '{layer}'")
        span_s += time.monotonic() - start
        rows = (line.split() for line in out.split('\n')[1:])
        ts = sorted(int(r[1]) for r in rows if len(r) == 3 and 0 < int(r[1]) < 9e18)
        frames += len(ts)
        gaps += [(b - a) / 1e6 for a, b in zip(ts, ts[1:])]
    active = sorted(g for g in gaps if g <= IDLE_MS)
    pct = lambda q: round(active[min(len(active) - 1, int(q * len(active)))], 1) if active else None
    print(json.dumps({
        'mapFps': round(frames / span_s, 1),
        'mapGapP50': pct(0.5),
        'mapGapP95': pct(0.95),
        'mapGapMax': round(max(gaps), 1) if gaps else None,
        'mapStutterPct': round(100 * sum(1 for g in active if g > STUTTER_MS) / len(active), 1) if active else None,
        'mapIdleGaps': sum(1 for g in gaps if g > IDLE_MS),
    }))


main()
