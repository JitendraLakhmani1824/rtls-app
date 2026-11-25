#!/bin/bash
# Stop: run `pnpm verify` before Claude finishes, if anything changed since the last green run.
# On failure, exit 2 with the errors so Claude keeps working. Gives up after 3 failures in a row (and says so),
# so a problem Claude can't fix never traps it in a loop.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
state_dir=.claude/.state
mkdir -p "$state_dir"
fingerprint=$( { git status --porcelain; git diff; } 2>/dev/null | shasum | cut -d' ' -f1)
[ "$fingerprint" = "$(cat "$state_dir/last-green" 2>/dev/null)" ] && exit 0

if out=$(pnpm -s verify 2>&1); then
  echo "$fingerprint" > "$state_dir/last-green"
  rm -f "$state_dir/failures"
  exit 0
fi

failures=$(( $(cat "$state_dir/failures" 2>/dev/null || echo 0) + 1 ))
echo "$failures" > "$state_dir/failures"
if [ "$failures" -ge 3 ]; then
  rm -f "$state_dir/failures"
  echo "pnpm verify still fails after 3 attempts — stopping. Tell the user what is failing and why." >&2
  exit 0
fi
echo "pnpm verify failed (attempt $failures of 3). Fix these before finishing:" >&2
echo "$out" | grep -vE '^\s*$' | tail -60 >&2
exit 2
