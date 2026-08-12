/**
 * Fixture: setTimeout with a string argument (implied eval)
 * Expected ESLint rule: no-implied-eval (or @typescript-eslint/no-implied-eval)
 * Used by scripts/verify-lint-rules to confirm the rule fires as an error.
 */
export function scheduleString(code: string, delayMs: number): ReturnType<typeof setTimeout> {
  return setTimeout(code, delayMs);
}
