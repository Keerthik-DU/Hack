/**
 * Fixture: new Function() constructor
 * Expected ESLint rule: no-new-func
 * Used by scripts/verify-lint-rules to confirm the rule fires as an error.
 */
export function buildRunner(body: string): (...args: unknown[]) => unknown {
  return new Function('...args', body) as (...args: unknown[]) => unknown;
}
