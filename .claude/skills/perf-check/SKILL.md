---
name: perf-check
description: Run the RTLS measurement matrix on the Android phone (release build) and write the results table. Only when the user asks for a performance run.
disable-model-invocation: true
---

# Performance check

The method is fixed so numbers are comparable between runs (plan §6, design §2.10).

## Rules

- **Release build on the Android phone only.** No dev builds, no simulator numbers.
- **`perf=1` in the link**; the on-screen overlay stays off (PERF lines come from `PerfRecorder`).
- **Same seed** for every cell. Fixed screen brightness. Note the battery temperature at the start and end (`adb shell dumpsys battery | grep temperature`, tenths of °C).
- **ABAB order, 3 runs per cell.** Report the median.
- **Cold start every run:** `adb shell am force-stop com.rtls.casestudy`, then open the link. Wait 10 s to warm up, then measure 3 s.

## One cell

```bash
adb shell am force-stop com.rtls.casestudy
adb shell "am start -a android.intent.action.VIEW -d 'rtls://scenario?friends=200&seed=42&rung=D&perf=1'"
sleep 10
scripts/map-frames-android.sh D-200 3
```

Record map frames/s, gap p50/p95/max, and from the PERF lines: jsFps, fixes/s, ingest/plan/motionFrame/stillFrame ms.

## Matrix

| Rungs | Friends | Scenario |
| --- | --- | --- |
| A, B, C, D | 200, 1,000 | concert |
| D | 50, 500 | concert |
| D | 200, 1,000 | marathon |

Plus the energy step: glide at 30 vs 60 fps, rung D, 500 friends. Rungs B and C and the marathon scenario arrive in M3/M2; run what exists and mark the rest "not yet".

## Output

Write `docs/results/<YYYY-MM-DD>-perf.md` (raw medians per cell, phone model, Android version, temperatures), update design §2.10, and state the crossover point and any step that didn't help.
