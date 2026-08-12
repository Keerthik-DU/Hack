/**
 * Fixture: direct eval() usage
 * Expected ESLint rule: no-eval
 * Used by scripts/verify-lint-rules to confirm the rule fires as an error.
 */
export function runDynamic(code: string): unknown {
  return eval(code);
}
