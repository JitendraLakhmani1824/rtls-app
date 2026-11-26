#!/usr/bin/env node
// Checks every src/features/<name>/ has the same shape, so the codebase grows the same way:
//   index.ts           exports <Name>Screen
//   <Name>Screen.tsx   thin: calls the hook, lays out views
//   hooks/             use*.ts (data + actions) with at least one *.test.tsx
//   views/             *.tsx components that take props
//   logic/             optional: pure functions, only when there is real logic
// Run by `pnpm verify`. Each error says how to fix it.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/features';
const ALLOWED_DIRS = new Set(['hooks', 'views', 'logic']);
const errors = [];
const fail = (feature, message) => errors.push(`src/features/${feature}: ${message}`);

for (const feature of readdirSync(ROOT).sort()) {
  const dir = join(ROOT, feature);
  if (!statSync(dir).isDirectory()) continue;
  const entries = readdirSync(dir);
  const screens = entries.filter((f) => f.endsWith('Screen.tsx'));

  if (screens.length !== 1) {
    fail(feature, `needs exactly one <Name>Screen.tsx at its root (found ${screens.length}).`);
  }
  if (!entries.includes('index.ts')) {
    fail(feature, 'needs index.ts exporting its screen: `export { XScreen } from \'./XScreen\';`');
  } else if (screens[0]) {
    const name = screens[0].replace('.tsx', '');
    if (!readFileSync(join(dir, 'index.ts'), 'utf8').includes(name)) {
      fail(feature, `index.ts should export ${name}.`);
    }
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!ALLOWED_DIRS.has(entry)) {
        fail(feature, `unexpected folder ${entry}/: use hooks/ (data + actions), views/ (props-only UI) or logic/ (pure functions).`);
      }
    } else if (entry !== 'index.ts' && entry !== 'CLAUDE.md' && !entry.endsWith('Screen.tsx')) {
      fail(feature, `move ${entry} into hooks/ (a use* hook or its test), views/ (a component) or logic/ (pure code).`);
    }
  }

  const hooks = existsSync(join(dir, 'hooks')) ? readdirSync(join(dir, 'hooks')) : [];
  if (!hooks.some((f) => /^use\w+\.ts$/.test(f))) {
    fail(feature, 'needs hooks/useX.ts: the only file that uses useManagers() and navigation.');
  }
  if (!hooks.some((f) => f.endsWith('.test.tsx') || f.endsWith('.test.ts'))) {
    fail(feature, 'needs a hook test in hooks/ (renderHook + createTestManagers()).');
  }
  for (const f of hooks) {
    if (!/^use\w+(\.test)?\.tsx?$/.test(f)) fail(feature, `hooks/${f}: hooks/ holds only use* hooks and their tests.`);
  }

  const views = existsSync(join(dir, 'views')) ? readdirSync(join(dir, 'views')) : [];
  if (views.length === 0) {
    fail(feature, 'needs views/ with at least one component (move the screen\'s UI pieces there).');
  }
  for (const f of views) {
    if (!/^[A-Z]\w+\.tsx$/.test(f)) fail(feature, `views/${f}: views/ holds components named in PascalCase (.tsx).`);
  }
}

if (errors.length > 0) {
  console.error(`Feature layout (scripts/check-features.mjs):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✔ feature layout ok (${readdirSync(ROOT).filter((f) => statSync(join(ROOT, f)).isDirectory()).length} features)`);
