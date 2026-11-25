@AGENTS.md

## Claude Code

- Before finishing any change, run `pnpm verify` and fix what it reports. The error messages say how.
- Path-specific rules load from `.claude/rules/` when you touch matching files.
- To see a change working, build and run it on the iOS simulator (`pnpm ios`) and read the `PERF {…}` lines Metro prints once a second.
