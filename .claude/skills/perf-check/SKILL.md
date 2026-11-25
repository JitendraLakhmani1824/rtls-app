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
- **Cold start every run**, 15 s warm-up, 5 s measured. `scripts/ladder-android.sh` does all of this.
- **Never edit a script while it runs:** bash reads it as it goes.

## A ladder (one row of the matrix)

```bash
scripts/ladder-android.sh 200 3 concert
```

One JSON row per run, then the median per rung. `RUNGS="D"` limits the rungs; `EXTRA="&fade=300"` adds link parameters, for a before/after on one change.

Each row has:
- **Map surface** (SurfaceFlinger, sampled in 1 s chunks: the compositor keeps only 127 frames): frames/s, gap p50/p95 over active gaps, max gap, stutter % (active gaps > 25 ms), idle gaps (> 100 ms: nothing to draw).
- **App UI** (`gfxinfo`): frames/s, janky %. Only rung A draws pins as app views.
- **PERF:** jsFps, jsLagMs (JS busy beyond one frame), longTasks, gcs, and ms per call for ingest, visibility, stillFrame, encodeStill / encode.

## Matrix

| Rungs | Friends | Scenario |
| --- | --- | --- |
| A, B, C, D | 200, 1,000 | concert |
| D | 50, 500 | concert |
| D | 200, 1,000 | marathon |

Plus the energy step: glide at 30 vs 60 fps, rung D, 500 friends.

## Output

Write `docs/results/<YYYY-MM-DD>-perf.md` (raw medians per cell, phone model, Android version, temperatures), update design §2.10, and state the crossover point and any step that didn't help.
