#!/usr/bin/env node
/**
 * verify-lint-rules.mjs — WO-051
 * Cross-platform verifier: runs ESLint against intentional prohibited-pattern
 * fixtures and asserts each fails with the expected rule name in the output.
 *
 * Invoked by: npm run lint:security-verify
 * Also wrapped by: scripts/verify-lint-rules.sh / .ps1
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'tests', 'fixtures', 'prohibited-patterns');

const fixtures = [
  { file: 'eval-usage.ts', rule: 'no-eval' },
  { file: 'dangerous-html.tsx', rule: 'react/no-danger' },
  { file: 'new-function.ts', rule: 'no-new-func' },
  { file: 'settimeout-string.ts', rule: 'no-implied-eval' },
];

process.env.ESLINT_USE_FLAT_CONFIG = 'true';

let failed = 0;

console.log('Verifying ESLint security rules against prohibited-pattern fixtures...\n');

for (const { file, rule } of fixtures) {
  const fixturePath = path.join(fixturesDir, file);

  if (!existsSync(fixturePath)) {
    console.log(`FAIL: missing fixture ${fixturePath}`);
    failed = 1;
    continue;
  }

  console.log(`→ ${path.relative(rootDir, fixturePath)} (expect rule: ${rule})`);

  const result = spawnSync(
    'npx',
    ['eslint', '--no-ignore', fixturePath],
    {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' },
      shell: true,
    },
  );

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const exitCode = result.status ?? 1;

  if (exitCode === 0) {
    console.log('  FAIL: ESLint exited 0 — expected a security violation');
    console.log(output);
    failed = 1;
    continue;
  }

  const hasRule = output.includes(rule);
  const hasTsImplied =
    rule === 'no-implied-eval' && output.includes('@typescript-eslint/no-implied-eval');

  if (hasRule || hasTsImplied) {
    const shown = hasTsImplied && !hasRule ? '@typescript-eslint/no-implied-eval' : rule;
    console.log(`  PASS: flagged with ${shown} (exit ${exitCode})`);
  } else {
    console.log(`  FAIL: expected rule '${rule}' not found in ESLint output`);
    console.log(output);
    failed = 1;
  }
  console.log('');
}

if (failed !== 0) {
  console.log('lint:security-verify FAILED — one or more fixtures were not flagged correctly');
  process.exit(1);
}

console.log('lint:security-verify PASSED — all prohibited patterns are enforced');
process.exit(0);
