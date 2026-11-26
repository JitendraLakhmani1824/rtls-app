# lab — dev-only tools

Not part of the product; may hold module-level state.

- `ladder/` — comparison rungs A–C (marker per friend; one source rebuilt per batch; + batching), opened by `rtls://scenario?…&rung=A|B|C`.
- `perf/` — `PerfRecorder`: one `PERF {…}` line a second in dev (JS fps, lag, long tasks, GCs, ms per engine step).
- `battery/` — the sharing-phone battery model behind `docs/results/m4-battery.md`.

Measuring on a device: the `perf-check` and `run-scenario` skills.
