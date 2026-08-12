import { PatternRegistry } from '@/engines/regex/pattern-registry';
import type { PatternDefinition, CompiledPattern } from '@/engines/types';

/**
 * Test-only PatternRegistry that accepts an explicit pattern definition array.
 * Enables RegexEngine mechanics tests independent of the production pattern set.
 */
export class MockPatternRegistry extends PatternRegistry {
  constructor(patterns: readonly PatternDefinition[] = []) {
    super([...patterns]);
  }

  /** Convenience accessor for assertions in isolated engine tests. */
  public getInjectedPatterns(): CompiledPattern[] {
    return this.getPatterns();
  }
}
