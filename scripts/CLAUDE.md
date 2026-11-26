# scripts

- `check-features.mjs` — every feature has the same shape (run by `pnpm verify`).
- `gen-import-rules.mjs` — writes `docs/import-rules.md` from `.dependency-cruiser.cjs` (`pnpm gen:rules`; `--check` in verify).
- `ladder-android.sh`, `map-frames-android.sh`, `sf_frames.py` — measure map frames on the Android phone (SurfaceFlinger, sampled in 1 s chunks).
- `diagrams/` — HLD and LLD images (`render.sh`, needs Chrome) → `docs/media/`.

Never edit a script while it runs (bash reads it as it goes).
