#!/bin/bash
# PostToolUse (Edit|Write): format and lint the file just edited. Lint errors go back to Claude (exit 2) with the fix in the message.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const i=JSON.parse(s).tool_input||{};process.stdout.write(i.file_path||i.path||"")}catch{}})')
case "$file" in *.ts|*.tsx|*.js|*.cjs|*.mjs) ;; *) exit 0 ;; esac
[ -f "$file" ] || exit 0
node_modules/.bin/prettier --write --log-level silent "$file" 2>/dev/null
if ! out=$(node_modules/.bin/eslint --no-warn-ignored "$file" 2>&1); then
  echo "ESLint found problems in $file — fix them before moving on:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
